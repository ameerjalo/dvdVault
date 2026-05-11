import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlmodel import Session
from starlette.middleware.base import BaseHTTPMiddleware

from database import get_session, init_db
from models import User
from schemas import (
    AdminStatsResponse,
    CategoryResponse,
    OrderCreate,
    OrderResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    Token,
    UserCreate,
    UserResponse,
)
from services import (
    AuthService,
    CategoryService,
    OrderError,
    OrderService,
    ProductService,
    StatsService,
    UserService,
    WishlistService,
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

limiter = Limiter(key_func=get_remote_address)


SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'",
    "Strict-Transport-Security": "max-age=31536000",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        return response


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": f"Too many requests. Try again later (limit: {exc.detail})."},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="E-commerce API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

_DEFAULT_DEV_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_DEV_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    email = AuthService.decode_token(token)
    if email is None:
        raise credentials_exception
    user = UserService(session).get_by_email(email)
    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to perform this action.",
        )
    return current_user


@app.post("/auth/register", response_model=UserResponse, status_code=201)
def register(
    payload: UserCreate,
    session: Session = Depends(get_session),
) -> UserResponse:
    service = UserService(session)
    if service.get_by_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered.",
        )
    return service.create_user(payload)


@app.post("/auth/token", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> Token:
    user = UserService(session).authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = AuthService.create_access_token(subject=user.email)
    return Token(access_token=token)


@app.get("/auth/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user


@app.get("/products", response_model=List[ProductResponse])
def list_products(
    session: Session = Depends(get_session),
    category_id: Optional[int] = Query(
        default=None,
        description="Filter products by category ID.",
    ),
    search_query: Optional[str] = Query(
        default=None,
        description="Case-insensitive search on product name.",
        max_length=100,
    ),
) -> List[ProductResponse]:
    return ProductService(session).get_all(
        category_id=category_id,
        search_query=search_query,
    )


@app.post("/products", response_model=ProductResponse, status_code=201)
def create_product(
    payload: ProductCreate,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> ProductResponse:
    return ProductService(session).create(payload)


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> ProductResponse:
    product = ProductService(session).update(product_id, payload)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )
    return product


@app.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> None:
    if not ProductService(session).delete(product_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )


@app.get("/categories", response_model=List[CategoryResponse])
def list_categories(session: Session = Depends(get_session)) -> List[CategoryResponse]:
    return CategoryService(session).get_all()


@app.post("/orders", response_model=OrderResponse, status_code=201)
def create_order(
    payload: OrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> OrderResponse:
    try:
        return OrderService(session).create_order(current_user.id, payload.items)
    except OrderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@app.get("/orders/me", response_model=List[OrderResponse])
def list_my_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[OrderResponse]:
    return OrderService(session).list_for_user(current_user.id)


@app.get("/wishlist", response_model=List[ProductResponse])
def get_wishlist(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[ProductResponse]:
    return WishlistService(session).get_for_user(current_user.id)


@app.post("/wishlist/{product_id}")
def toggle_wishlist(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    product = ProductService(session).get(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )
    added = WishlistService(session).toggle(current_user.id, product_id)
    return {"product_id": product_id, "added": added}


@app.get("/admin/stats", response_model=AdminStatsResponse)
def admin_stats(
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> AdminStatsResponse:
    service = StatsService(session)
    return AdminStatsResponse(
        total_revenue=service.total_revenue(),
        orders_last_7_days=service.orders_last_7_days(),
        stock_by_category=service.stock_by_category(),
    )
