# Git Workflow and Commit Strategy

## Branching Strategy

We use a modified Git Flow strategy optimized for serverless development:

### Branch Types

1. **main** - Production-ready code
   - Always deployable
   - Protected branch with required reviews
   - Automatic deployment to production

2. **develop** - Integration branch
   - Latest development changes
   - Automatic deployment to staging environment
   - Base for feature branches

3. **feature/** - Feature development
   - Format: `feature/ISSUE-123-short-description`
   - Created from `develop`
   - Merged back to `develop` via PR

4. **hotfix/** - Production fixes
   - Format: `hotfix/ISSUE-456-critical-fix`
   - Created from `main`
   - Merged to both `main` and `develop`

5. **release/** - Release preparation
   - Format: `release/v1.2.0`
   - Created from `develop`
   - Bug fixes only, no new features

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **ci**: CI/CD changes
- **perf**: Performance improvements

### Examples
```bash
feat(api): add invoice upload endpoint

Implement POST /api/invoices endpoint with:
- Presigned URL generation
- File validation
- Error handling

Closes #123

fix(lambda): handle Textract timeout errors

Add retry logic and proper error handling for
Textract service timeouts in process-invoice function.

Fixes #456

docs: update API documentation

Add examples for new invoice endpoints and
update authentication section.

chore(deps): update AWS SDK to v3.400.0

ci: add automated security scanning

Add Snyk security scanning to GitHub Actions
workflow for dependency vulnerabilities.
```

## Development Milestones and Commits

### Phase 1: Project Foundation
```bash
# Initial setup
git commit -m "chore: initialize project structure and configuration"

# Infrastructure setup
git commit -m "feat(infra): add CDK infrastructure for core AWS services"

# Basic API structure
git commit -m "feat(api): implement basic API Gateway and Lambda structure"
```

### Phase 2: Core Functionality
```bash
# File upload
git commit -m "feat(upload): implement secure file upload with presigned URLs"

# Textract integration
git commit -m "feat(textract): add invoice text extraction with AWS Textract"

# Data processing
git commit -m "feat(processing): implement invoice data extraction and structuring"

# Database operations
git commit -m "feat(database): add DynamoDB operations for invoice metadata"
```

### Phase 3: Frontend and Integration
```bash
# Frontend setup
git commit -m "feat(frontend): create React app with invoice upload interface"

# Authentication
git commit -m "feat(auth): integrate AWS Cognito authentication"

# API integration
git commit -m "feat(integration): connect frontend to backend APIs"
```

### Phase 4: Testing and Quality
```bash
# Unit tests
git commit -m "test: add comprehensive unit tests for Lambda functions"

# Integration tests
git commit -m "test: implement integration tests for API endpoints"

# E2E tests
git commit -m "test: add end-to-end testing with Cypress"
```

### Phase 5: DevOps and Deployment
```bash
# CI/CD pipeline
git commit -m "ci: implement GitHub Actions workflow for automated deployment"

# Monitoring
git commit -m "feat(monitoring): add CloudWatch dashboards and alarms"

# Documentation
git commit -m "docs: add comprehensive deployment and usage documentation"
```

## Pull Request Guidelines

### PR Title Format
Follow the same convention as commit messages:
```
feat(scope): brief description of changes
```

### PR Description Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced

## Related Issues
Closes #123
```

### Review Requirements
- At least one approval required
- All CI checks must pass
- No merge conflicts
- Branch up to date with target

## Release Process

### Version Numbering
We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps
1. Create release branch from `develop`
2. Update version numbers and changelog
3. Test release candidate
4. Merge to `main` with release tag
5. Deploy to production
6. Merge back to `develop`

### Tagging Convention
```bash
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

## Emergency Hotfix Process

1. Create hotfix branch from `main`
2. Implement minimal fix
3. Test thoroughly
4. Create PR to `main`
5. After merge, cherry-pick to `develop`
6. Tag new patch version

## Best Practices

### Commit Frequency
- Commit early and often
- Each commit should be a logical unit
- Avoid mixing unrelated changes

### Commit Quality
- Write clear, descriptive messages
- Include context and reasoning
- Reference issues when applicable

### Branch Hygiene
- Keep branches focused and short-lived
- Rebase feature branches before merging
- Delete merged branches promptly

### Code Review
- Review code, not the person
- Provide constructive feedback
- Test the changes locally when needed
