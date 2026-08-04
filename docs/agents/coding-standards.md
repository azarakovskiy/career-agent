# Coding standards

## File and function boundaries

Keep files isolated and as small as practical. Each file and function should have one clear responsibility.

## Repository boundaries

Keep one repository interface or repository implementation per file. Keep repository-specific SQL in the matching query file. When one repository is the public adapter for several persistence repositories, keep the adapter in its own file and delegate to those repositories instead of combining their implementations.

## Refactoring scope

When existing code breaks a coding rule, make a small, intentional improvement when the change is directly related. Apply “leave the code better than before” lightly; do not undertake a major refactor of pre-existing code without a direct request.
