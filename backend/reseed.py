"""One-off script: wipe existing data and re-seed.

Use this when changing the seed catalog (e.g. the ByteBooks → dvdVault rebrand).
Drops every SQLModel table then calls seed() to recreate categories, films, and admin.

DESTRUCTIVE — only run against a database you intend to reset.
"""

from sqlmodel import SQLModel

from database import engine
from seed import seed


def main() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    seed()


if __name__ == "__main__":
    main()
