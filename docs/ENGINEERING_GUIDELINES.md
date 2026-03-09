# Engineering Guidelines

This document defines how code should be written in this repository.

The purpose is to maintain consistency, reliability, and production-quality architecture when AI agents implement features.

These rules apply to all phases of the project.

---

# 1. Code Philosophy

The codebase should prioritize:

- simplicity
- clarity
- maintainability
- predictable architecture

Avoid clever or overly complex solutions.

Prefer straightforward implementations that future developers can easily understand.

---

# 2. Backend Architecture Rules

Backend must follow a layered structure.

Routes → Services → Database models.

Example:

API Route
calls
Service layer

Service layer
contains business logic

Database models
represent persistence only

Routes must not contain business logic.

Services must not depend on UI logic.

---

# 3. Naming Conventions

Names must be clear and descriptive.

Avoid abbreviations.

Examples:

Good:
createOrder
getUserOrders
updateMenuItem

Bad:
procOrd
usrData

---

# 4. Error Handling

All API routes must return consistent errors.

Use structured error responses.

Example:

{
  "error": "USER_BANNED",
  "message": "This user is banned and cannot place orders."
}

Avoid returning raw stack traces.

---

# 5. Validation Rules

All API inputs must be validated.

Use Pydantic schemas.

Validation must include:

- required fields
- correct types
- business constraints

Never trust client input.

---

# 6. Database Safety

Database operations must:

- use transactions when needed
- prevent partial updates
- maintain data integrity

Avoid writing raw SQL unless necessary.

---

# 7. Order Integrity Rules

Orders must store snapshots of items and prices.

This ensures historical orders remain correct even if the menu changes.

Never recalculate past order totals from current menu data.

---

# 8. Code Duplication

Avoid duplicate logic.

If multiple files repeat similar logic, extract a shared utility or service.

However, avoid over-generalizing prematurely.

---

# 9. Refactoring Discipline

Refactors should:

- improve readability
- reduce duplication
- maintain behavior

Do not introduce breaking changes without updating documentation.

---

# 10. Testing Expectations

Critical flows should be testable:

- authentication
- order creation
- promotions
- scheduling

Even if full test coverage is not implemented immediately, code should remain testable.

---

# 11. Performance Considerations

Avoid inefficient database queries.

Common problems to avoid:

- N+1 queries
- unnecessary repeated queries
- loading excessive data

Use appropriate indexes where necessary.

---

# 12. Logging

Important system events should be logged.

Examples:

- order creation
- order acceptance
- user bans
- admin changes

Logs should be structured and meaningful.

---

# 13. Dependency Discipline

Do not introduce new libraries unless necessary.

Prefer using tools already defined in:

/docs/TECH_STACK.md

---

# 14. Documentation Discipline

If a feature introduces a new pattern or rule:

- update documentation
- explain the change clearly

The codebase and documentation must remain aligned.

---

# 15. Agent Behavior Rules

The agent must:

- read relevant docs before coding
- follow architecture rules
- avoid inventing undocumented features
- prefer simple and maintainable solutions
- explain assumptions when required

If documentation and implementation conflict, the documentation should be considered authoritative unless explicitly updated.