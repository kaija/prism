# Frontend Project Template

## Introduction

This template provides comprehensive guidance for establishing frontend projects with modern best practices and consistent patterns. Frontend projects focus on building user interfaces and client-side applications that run in web browsers or similar environments.

Use this template when:
- Building single-page applications (SPAs)
- Creating progressive web apps (PWAs)
- Developing component-based user interfaces
- Implementing client-side rendering or server-side rendering solutions

Key concerns for frontend projects include user experience, accessibility, performance, state management, and cross-browser compatibility. This template addresses these concerns through structured recommendations for technology choices, architecture patterns, and development practices.

## Language & Technology Choices

### Recommended Languages

**TypeScript** (Recommended)

- Provides static typing for improved code quality and developer experience
- Catches errors at compile time rather than runtime
- Excellent IDE support with autocomplete and refactoring
- Scales well for large codebases and team collaboration
- Seamless integration with modern frontend frameworks
- Trade-off: Adds build step and learning curve for JavaScript developers

**JavaScript (ES2020+)**
- Universal browser support and zero build configuration required
- Lower barrier to entry for new developers
- Faster initial development for small projects
- Large ecosystem and community
- Trade-off: Lacks type safety, more prone to runtime errors in large codebases

### Technology Stack

**Core Technologies:**
- HTML5 for semantic markup
- CSS3 or CSS preprocessors (Sass, Less) for styling
- Modern JavaScript (ES2020+) or TypeScript
- Package manager: npm or yarn

**Build Tools:**
- Vite (recommended for new projects) - fast, modern build tool
- Webpack - mature, highly configurable bundler
- esbuild - extremely fast JavaScript bundler
- Parcel - zero-configuration bundler

## Framework Recommendations

### Primary Frameworks

**React** (Most Popular)
- Large ecosystem with extensive third-party libraries
- Component-based architecture with hooks for state and lifecycle
- Virtual DOM for efficient updates
- Strong community support and job market demand
- Flexible - can be used for small widgets or large applications
- Trade-offs: Requires additional libraries for routing and state management, JSX syntax learning curve

**Vue** (Developer-Friendly)
- Progressive framework that scales from library to full framework
- Intuitive template syntax similar to HTML
- Excellent documentation and gentle learning curve
- Built-in state management (Pinia) and routing (Vue Router)
- Single-file components for better organization
- Trade-offs: Smaller ecosystem than React, fewer job opportunities

**Svelte** (Performance-Focused)
- Compiles components to vanilla JavaScript at build time
- No virtual DOM - direct DOM manipulation for better performance
- Less boilerplate code and simpler syntax
- Built-in reactivity without hooks or observables
- Smaller bundle sizes
- Trade-offs: Smaller ecosystem, less mature tooling, fewer developers familiar with it

**Angular** (Enterprise-Ready)
- Full-featured framework with everything included
- TypeScript-first with strong typing throughout
- Dependency injection and comprehensive testing utilities
- Opinionated structure good for large teams
- Backed by Google with long-term support
- Trade-offs: Steeper learning curve, more verbose, larger bundle sizes

### Supporting Libraries

**State Management:**
- Redux / Redux Toolkit (React) - predictable state container
- Zustand (React) - lightweight state management
- Pinia (Vue) - official Vue state management
- MobX - reactive state management
- Context API (React) - built-in lightweight solution

**Routing:**
- React Router (React)
- Vue Router (Vue)
- TanStack Router - type-safe routing
- SvelteKit (Svelte) - built-in routing

**UI Component Libraries:**
- Material-UI (MUI) - Material Design components
- Ant Design - enterprise-grade UI components
- Chakra UI - accessible component library
- shadcn/ui - customizable component collection
- Tailwind CSS - utility-first CSS framework

**Data Fetching:**
- TanStack Query (React Query) - powerful data synchronization
- SWR - React hooks for data fetching
- Apollo Client - GraphQL client
- Axios - HTTP client

## Architecture Patterns

### Component Architecture

**Atomic Design Pattern**
- Atoms: Basic building blocks (buttons, inputs, labels)
- Molecules: Simple combinations of atoms (search bar, form field)
- Organisms: Complex components (navigation bar, card grid)
- Templates: Page-level layouts
- Pages: Specific instances of templates with real content

**Container/Presentational Pattern**
- Container components: Handle logic, state, and data fetching
- Presentational components: Focus on UI rendering, receive data via props
- Clear separation of concerns
- Easier testing and reusability

**Composition Pattern**
- Build complex components from simpler ones
- Use props.children and component composition
- Avoid deep prop drilling
- Flexible and maintainable component hierarchies

### State Management Patterns

**Local State**
- Use component-level state for UI-specific data
- Keep state close to where it's used
- Minimize unnecessary global state

**Global State**
- Use for data shared across multiple components
- Authentication state, user preferences, theme
- Choose appropriate tool based on complexity (Context API for simple, Redux/Zustand for complex)

**Server State**
- Treat server data differently from client state
- Use specialized libraries (TanStack Query, SWR)
- Handle caching, revalidation, and synchronization

**URL State**
- Store UI state in URL when appropriate
- Enables bookmarking and sharing
- Filters, pagination, selected items

### Directory Structure

```plaintext
src/
├── components/
│   ├── common/          # Reusable components
│   ├── features/        # Feature-specific components
│   └── layout/          # Layout components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── services/            # API services
├── store/               # State management
├── types/               # TypeScript types
├── styles/              # Global styles
└── assets/              # Images, fonts, etc.
```

## Best Practices

### General Principles

**Component Design:**
- Keep components small and focused on a single responsibility
- Prefer composition over inheritance
- Make components reusable and configurable via props
- Use meaningful component and prop names

**Performance:**
- Implement code splitting and lazy loading for routes
- Optimize images (use appropriate formats, lazy loading, responsive images)
- Minimize bundle size (tree shaking, analyze bundle)
- Use memoization judiciously (React.memo, useMemo, useCallback)
- Avoid premature optimization - measure first

**Accessibility:**
- Use semantic HTML elements
- Provide proper ARIA labels and roles
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Test with screen readers
- Follow WCAG 2.1 guidelines

**Security:**
- Sanitize user input to prevent XSS attacks
- Use Content Security Policy (CSP)
- Avoid storing sensitive data in localStorage
- Implement proper authentication and authorization
- Keep dependencies updated

### Common Pitfalls to Avoid

- Over-engineering with unnecessary abstractions
- Prop drilling through many component levels
- Massive components that do too much
- Ignoring accessibility from the start
- Not handling loading and error states
- Inconsistent naming conventions
- Mixing business logic with presentation
- Not considering mobile and responsive design

## Code Style & Formatting

### Naming Conventions

**Components:**
- PascalCase for component names: `UserProfile`, `NavigationBar`
- Descriptive names that indicate purpose
- Avoid generic names like `Component1` or `Wrapper`

**Functions and Variables:**
- camelCase for functions and variables: `getUserData`, `isLoading`
- Boolean variables should be prefixed: `isLoading`, `hasError`, `canEdit`
- Event handlers: `handleClick`, `onSubmit`, `handleInputChange`

**Files:**
- Component files: `UserProfile.tsx` or `UserProfile.jsx`
- Utility files: `formatDate.ts`, `apiClient.ts`
- Test files: `UserProfile.test.tsx`
- Style files: `UserProfile.module.css` or `userProfile.styles.ts`

**Constants:**
- UPPER_SNAKE_CASE for constants: `API_BASE_URL`, `MAX_RETRY_ATTEMPTS`

### File Organization

- One component per file (except for small, tightly coupled components)
- Co-locate related files (component, styles, tests)
- Group by feature rather than file type for larger applications
- Keep file size reasonable (under 300 lines as a guideline)

### Formatting Rules

**Use a formatter:**
- Prettier (recommended) for consistent code formatting
- Configure in `.prettierrc` file
- Integrate with editor for format-on-save

**Linting:**
- ESLint for code quality and catching errors
- Use recommended configs: `eslint:recommended`, `plugin:react/recommended`
- Add accessibility plugin: `eslint-plugin-jsx-a11y`
- TypeScript: `@typescript-eslint/recommended`

**Code Style:**
- Use 2-space indentation
- Single quotes for strings (or configure Prettier)
- Semicolons (or configure to omit consistently)
- Trailing commas in multi-line structures
- Max line length: 80-100 characters

### Documentation Standards

**Component Documentation:**
- Add JSDoc comments for complex components
- Document props with TypeScript interfaces or PropTypes
- Include usage examples for reusable components
- Document any non-obvious behavior

**Code Comments:**
- Explain "why" not "what"
- Comment complex algorithms or business logic
- Avoid obvious comments
- Keep comments up to date with code changes

## Testing Approaches

### Testing Strategy

Implement a testing pyramid approach:
- Many unit tests for individual components and functions
- Moderate integration tests for component interactions
- Few end-to-end tests for critical user flows

Focus on testing behavior and user interactions rather than implementation details.

### Unit Testing

**Component Testing:**
- Test component rendering with different props
- Test user interactions (clicks, input changes)
- Test conditional rendering
- Test error states and edge cases

**Recommended Tools:**
- Vitest or Jest - test runners
- React Testing Library - component testing (React)
- Vue Test Utils - component testing (Vue)
- Testing Library - DOM testing utilities

**Example Approach:**
```typescript
// Test what users see and do, not implementation
test('displays error message when login fails', async () => {
  render(<LoginForm />);
  
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
  
  expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
});
```

### Integration Testing

**Component Integration:**
- Test multiple components working together
- Test data flow between parent and child components
- Test context providers and consumers
- Test routing and navigation

**API Integration:**
- Mock API calls in tests
- Test loading, success, and error states
- Use tools like MSW (Mock Service Worker) for realistic mocking

### End-to-End Testing

**Critical User Flows:**
- Authentication flows
- Core business processes
- Payment and checkout flows
- Form submissions

**Recommended Tools:**
- Playwright - modern, reliable E2E testing
- Cypress - popular E2E testing framework
- Puppeteer - headless browser automation

**Best Practices:**
- Keep E2E tests focused on happy paths and critical flows
- Run E2E tests in CI/CD pipeline
- Use data-testid attributes for stable selectors
- Avoid testing implementation details

### Test Coverage Expectations

- Aim for 70-80% code coverage
- 100% coverage of critical business logic
- Focus on meaningful tests over coverage metrics
- Test edge cases and error handling
- Don't sacrifice test quality for coverage numbers

## Deployment Considerations

### Build Process

**Production Build:**
- Minify and bundle code
- Remove development-only code
- Optimize assets (images, fonts)
- Generate source maps for debugging
- Set environment variables

**Environment Configuration:**
- Use environment variables for API endpoints
- Separate configs for dev, staging, production
- Never commit secrets or API keys
- Use `.env` files (not committed) or secret management

### Deployment Strategies

**Static Hosting:**
- Vercel - optimized for Next.js and React
- Netlify - easy deployment with Git integration
- Cloudflare Pages - global CDN with edge functions
- AWS S3 + CloudFront - scalable static hosting
- GitHub Pages - free hosting for open source

**Server-Side Rendering (SSR):**
- Vercel - built-in SSR support
- AWS Amplify - full-stack deployment
- Custom Node.js server on cloud platforms

**Containerization:**
- Docker for consistent environments
- Kubernetes for orchestration at scale
- Container registries (Docker Hub, ECR, GCR)

### CI/CD Patterns

**Continuous Integration:**
- Run tests on every commit
- Lint and format checks
- Build verification
- Automated dependency updates

**Continuous Deployment:**
- Deploy to staging on merge to main
- Deploy to production on release tags
- Automated rollback on failures
- Preview deployments for pull requests

**Recommended Tools:**
- GitHub Actions - integrated with GitHub
- GitLab CI - integrated with GitLab
- CircleCI - powerful and flexible
- Jenkins - self-hosted option

### Monitoring and Observability

**Error Tracking:**
- Sentry - error monitoring and tracking
- LogRocket - session replay and logging
- Rollbar - real-time error tracking

**Performance Monitoring:**
- Google Analytics - user analytics
- Lighthouse CI - performance metrics
- Web Vitals - core performance metrics
- New Relic / Datadog - APM solutions

**Logging:**
- Console logs for development
- Structured logging for production
- Log aggregation (CloudWatch, Datadog)
- Client-side error logging

### Rollback Procedures

**Version Control:**
- Tag releases with semantic versioning
- Maintain release branches
- Document breaking changes

**Rollback Strategy:**
- Keep previous build artifacts
- Automated rollback on critical errors
- Database migration rollback plan
- Communication plan for incidents

**Health Checks:**
- Implement health check endpoints
- Monitor deployment success
- Automated smoke tests post-deployment
- Gradual rollout for large changes

## State Management

### When to Use Global State

Use global state management when:
- Data is needed across many components
- Data needs to persist across route changes
- Multiple components need to modify the same data
- You need time-travel debugging or state persistence

Avoid global state for:
- UI-specific state (modals, dropdowns)
- Form input values (use form libraries)
- Derived data (compute on the fly)

### State Management Solutions

**Redux Toolkit** (React - Complex Applications)
- Predictable state updates with actions and reducers
- Excellent DevTools for debugging
- Middleware for async operations
- Best for large applications with complex state

**Zustand** (React - Simple to Medium Applications)
- Minimal boilerplate
- Hook-based API
- No providers needed
- Good TypeScript support

**Context API** (React - Simple State Sharing)
- Built into React
- Good for theme, auth, localization
- Avoid for frequently changing data
- Can cause unnecessary re-renders

**Pinia** (Vue - Official State Management)
- Intuitive API similar to Vue Composition API
- TypeScript support
- DevTools integration
- Modular store design

**Signals** (Framework-Agnostic Reactivity)
- Fine-grained reactivity primitive
- Automatic dependency tracking
- Minimal re-renders and optimal performance
- Used in Solid.js, Preact Signals, Angular Signals
- Lightweight and composable

## Routing

### Client-Side Routing

**Route Organization:**
- Define routes in a central location
- Use nested routes for layouts
- Implement route guards for authentication
- Handle 404 and error pages

**Code Splitting:**
- Lazy load route components
- Reduce initial bundle size
- Improve time to interactive

**Route Parameters:**
- Use dynamic segments for IDs
- Parse and validate route params
- Handle missing or invalid params

### Navigation Patterns

**Programmatic Navigation:**
- Navigate after form submission
- Redirect after authentication
- Handle navigation in event handlers

**Link Components:**
- Use framework-specific link components
- Prefetch routes on hover
- Active link styling

## Performance Optimization

### Bundle Optimization

- Code splitting by route
- Tree shaking to remove unused code
- Analyze bundle with webpack-bundle-analyzer
- Use dynamic imports for large libraries
- Implement lazy loading for images and components

### Rendering Optimization

- Memoize expensive computations
- Virtualize long lists (react-window, react-virtualized)
- Debounce and throttle event handlers
- Optimize re-renders with React.memo or Vue's computed
- Use production builds in production

### Caching Strategies

- Cache API responses
- Use service workers for offline support
- Implement stale-while-revalidate pattern
- Cache static assets with long TTL
- Version assets for cache busting

## Accessibility

### WCAG Compliance

**Level A (Minimum):**
- Text alternatives for images
- Keyboard accessible
- Sufficient color contrast
- No time limits on reading

**Level AA (Recommended):**
- Contrast ratio of at least 4.5:1
- Resize text up to 200%
- Multiple ways to find pages
- Consistent navigation

### Implementation Guidelines

**Semantic HTML:**
- Use appropriate elements (button, nav, main, article)
- Proper heading hierarchy (h1 → h2 → h3)
- Form labels associated with inputs
- Landmark regions for screen readers

**ARIA Attributes:**
- Use ARIA labels for icon buttons
- Implement ARIA live regions for dynamic content
- Add ARIA roles when semantic HTML isn't sufficient
- Don't override native semantics unnecessarily

**Keyboard Navigation:**
- All interactive elements focusable
- Visible focus indicators
- Logical tab order
- Keyboard shortcuts for common actions
- Trap focus in modals

**Testing:**
- Use automated tools (axe, Lighthouse)
- Manual keyboard testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Color contrast checkers

## Build Tools and Development Environment

### Development Server

- Hot module replacement (HMR) for instant updates
- Fast refresh for preserving component state
- HTTPS for local development when needed
- Proxy API requests to avoid CORS issues

### Build Configuration

**Vite Configuration:**
- Fast cold start and HMR
- Native ES modules in development
- Optimized production builds
- Plugin ecosystem for framework integration

**Webpack Configuration:**
- Highly customizable
- Mature plugin ecosystem
- Code splitting strategies
- Asset optimization

### Developer Experience

**Editor Setup:**
- VS Code with recommended extensions
- ESLint and Prettier integration
- TypeScript language server
- Debugger configuration

**Git Hooks:**
- Pre-commit: lint and format
- Pre-push: run tests
- Commit message linting
- Use Husky for Git hooks

**Documentation:**
- README with setup instructions
- Contributing guidelines
- Component documentation (Storybook)
- API documentation

## Conclusion

This template provides a comprehensive foundation for frontend projects. Adapt these recommendations to your specific project needs, team size, and requirements. The key is to establish consistent patterns early and evolve them as your project grows.

Remember:
- Start simple and add complexity as needed
- Prioritize user experience and accessibility
- Write tests for critical functionality
- Keep dependencies updated
- Document decisions and patterns
- Iterate based on team feedback

For questions or suggestions about this template, consult with your team and adapt it to your organization's specific needs and constraints.
