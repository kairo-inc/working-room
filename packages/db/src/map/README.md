# Mapper functions

Entity <-> Domain <-> Ai

1. Entity
   - Entity types used in database and repositories
2. Domain
   - Domain types used in services and resolvers. This model is designed to be independent of the database and can be used in any application level context.
3. Ai
   - AI SDK compatible types. This model is designed to be used in AI SDKs and can be used in any AI related context. Only used in the core package.
   - Mappers between domain <-> ai are defined in the core package, and mappers between domain <-> entity are defined in the db package.

Domain types are defined in `@wr/shared` package, and entity types are defined in `@wr/db` package. Mapper functions convert between these two types. They are used in services and resolvers to separate domain logic from database logic.
