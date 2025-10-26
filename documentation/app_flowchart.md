flowchart TD
    A[Chef opens app] --> B[Check authentication]
    B -->|Not authenticated| C[Login screen]
    B -->|Authenticated| D[Dashboard]
    C --> D
    D --> E[Fetch menu data]
    E --> F[Display menu table]
    F --> G[Click add new dish]
    G --> H[Show add/edit dish form]
    H --> I[Submit form]
    I --> J[Validate input]
    J --> K[Save to Supabase]
    K --> E
    D --> L[Get AI suggestions]
    L --> M[Show loading state]
    M --> N[Fetch AI recommendations]
    N --> O[Display suggestions]
    O --> P[Add suggestion to menu]
    P --> K