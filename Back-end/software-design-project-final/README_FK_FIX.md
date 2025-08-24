# Foreign Key Relationship Fix

## Issues Identified and Fixed:

### 1. **Transformer Entity Issues:**
- Added explicit column names for all fields
- Added `orphanRemoval = true` to the `@OneToMany` relationship
- Improved cascade configuration

### 2. **Image Entity Issues:**
- Added explicit `@ForeignKey` annotation with a named constraint
- Ensured proper foreign key column naming
- Made the relationship mapping explicit

### 3. **Application Configuration:**
- Changed `ddl-auto` from `create` to `create-drop` for better development experience
- Added MySQL dialect configuration
- This will recreate tables on each startup, avoiding foreign key conflicts

### 4. **Key Changes Made:**

#### Transformer.java:
```java
@OneToMany(mappedBy = "transformer", cascade = CascadeType.ALL, 
           fetch = FetchType.LAZY, orphanRemoval = true)
private List<Image> images = new ArrayList<>();
```

#### Image.java:
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "transformer_id", nullable = false, 
            foreignKey = @ForeignKey(name = "FK_image_transformer"))
private Transformer transformer;
```

### 5. **Steps to Test:**
1. Drop the existing database: `DROP DATABASE react_test_db;`
2. Create fresh database: `CREATE DATABASE react_test_db;`
3. Restart the application
4. The foreign key constraints should now work properly

### 6. **Alternative Solutions (if issues persist):**
If you still face issues, consider:
- Using `@JsonIgnore` on the `images` field in Transformer to avoid serialization cycles
- Adding proper transaction management in services
- Using DTOs instead of direct entity exposure in controllers


# Docker deployment

# Build the Docker image
```bash
docker build -t demo-deployment . 

# Run the Docker container
docker tag demo-deployment nidula437/software-design-comp:fixed

# Push the Docker image to the registry
docker push nidula437/software-design-comp:fixed

```

docker.io/nidula437/software-design-comp:fixed