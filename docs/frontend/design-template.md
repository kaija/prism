# Frontend & Mobile Design System Guide

## Introduction

This comprehensive design guide establishes visual and interaction standards for frontend and mobile applications. It provides detailed specifications for colors, typography, components, layouts, animations, and interaction patterns to ensure consistency and quality across all user interfaces.

Use this guide when:
- Designing new features or screens
- Building reusable UI components
- Establishing brand consistency
- Creating design tokens for implementation
- Onboarding designers and developers

## Design Principles

### Core Principles

**Consistency**: Maintain uniform patterns across all interfaces
**Clarity**: Prioritize readability and clear visual hierarchy
**Efficiency**: Minimize cognitive load and interaction steps
**Accessibility**: Design for all users regardless of ability
**Responsiveness**: Adapt seamlessly across devices and screen sizes
**Delight**: Add thoughtful micro-interactions and polish

## Color Palette

### Primary Colors

**Brand Primary**
- Primary 900: `#0A2540` - Darkest shade for text on light backgrounds
- Primary 700: `#1A4D7A` - Dark shade for hover states
- Primary 500: `#2563EB` - Main brand color for primary actions
- Primary 300: `#60A5FA` - Light shade for backgrounds
- Primary 100: `#DBEAFE` - Lightest shade for subtle backgrounds
- Primary 50: `#EFF6FF` - Very light for hover states

**Usage**: Primary buttons, links, active states, brand elements

**Brand Secondary**
- Secondary 900: `#4C1D95` - Darkest shade
- Secondary 700: `#6D28D9` - Dark shade
- Secondary 500: `#8B5CF6` - Main secondary color
- Secondary 300: `#A78BFA` - Light shade
- Secondary 100: `#E9D5FF` - Lightest shade
- Secondary 50: `#FAF5FF` - Very light

**Usage**: Secondary actions, accents, highlights

### Semantic Colors

**Success**
- Success 900: `#14532D`
- Success 700: `#15803D`
- Success 500: `#22C55E` - Main success color
- Success 300: `#86EFAC` - Light shade
- Success 100: `#DCFCE7` - Lightest shade

**Usage**: Success messages, confirmations, positive states

**Warning**
- Warning 900: `#78350F`
- Warning 700: `#B45309`
- Warning 500: `#F59E0B` - Main warning color
- Warning 300: `#FCD34D` - Light shade
- Warning 100: `#FEF3C7` - Lightest shade

**Usage**: Warning messages, caution states, pending actions

**Error**
- Error 900: `#7F1D1D`
- Error 700: `#B91C1C`
- Error 500: `#EF4444` - Main error color
- Error 300: `#FCA5A5` - Light shade
- Error 100: `#FEE2E2` - Lightest shade

**Usage**: Error messages, destructive actions, validation errors

**Info**
- Info 900: `#0C4A6E`
- Info 700: `#0369A1`
- Info 500: `#0EA5E9` - Main info color
- Info 300: `#7DD3FC` - Light shade
- Info 100: `#E0F2FE` - Lightest shade

**Usage**: Informational messages, tips, neutral notifications

### Neutral Colors

**Grayscale**
- Gray 950: `#030712` - Almost black
- Gray 900: `#111827` - Primary text
- Gray 800: `#1F2937` - Secondary text
- Gray 700: `#374151` - Tertiary text
- Gray 600: `#4B5563` - Placeholder text
- Gray 500: `#6B7280` - Disabled text
- Gray 400: `#9CA3AF` - Borders
- Gray 300: `#D1D5DB` - Dividers
- Gray 200: `#E5E7EB` - Light borders
- Gray 100: `#F3F4F6` - Background
- Gray 50: `#F9FAFB` - Light background
- White: `#FFFFFF` - Pure white

**Usage**: Text, borders, backgrounds, dividers

### Background Colors

**Light Mode**
- Background Primary: `#FFFFFF` - Main content background
- Background Secondary: `#F9FAFB` - Alternate sections
- Background Tertiary: `#F3F4F6` - Cards, panels
- Surface: `#FFFFFF` - Elevated surfaces
- Overlay: `rgba(0, 0, 0, 0.5)` - Modal overlays

**Dark Mode**
- Background Primary: `#111827` - Main content background
- Background Secondary: `#1F2937` - Alternate sections
- Background Tertiary: `#374151` - Cards, panels
- Surface: `#1F2937` - Elevated surfaces
- Overlay: `rgba(0, 0, 0, 0.7)` - Modal overlays

### Color Usage Guidelines

**Contrast Requirements**
- Text on background: Minimum 4.5:1 ratio (WCAG AA)
- Large text (18pt+): Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio against background

**Color Combinations**
- Primary text on white: Gray 900
- Secondary text on white: Gray 700
- Disabled text on white: Gray 500
- Primary button: Primary 500 background, White text
- Secondary button: Gray 100 background, Gray 900 text
- Error text: Error 700 on light backgrounds

**Accessibility**
- Never rely on color alone to convey information
- Provide text labels or icons alongside color indicators
- Test all color combinations with contrast checkers
- Support both light and dark modes

## Typography

### Font Families

**Primary Font (Sans-Serif)**
- Font: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Usage: Body text, UI elements, headings
- Characteristics: Clean, modern, highly readable

**Secondary Font (Serif)**
- Font: Georgia, "Times New Roman", serif
- Usage: Long-form content, articles, editorial
- Characteristics: Traditional, elegant, readable

**Monospace Font**
- Font: "Fira Code", "JetBrains Mono", Consolas, Monaco, monospace
- Usage: Code blocks, technical content, data
- Characteristics: Fixed-width, clear character distinction

### Type Scale

**Desktop/Web**
- Display Large: 72px / 4.5rem - Line height: 1.1 - Weight: 700
- Display: 60px / 3.75rem - Line height: 1.1 - Weight: 700
- H1: 48px / 3rem - Line height: 1.2 - Weight: 700
- H2: 36px / 2.25rem - Line height: 1.3 - Weight: 600
- H3: 30px / 1.875rem - Line height: 1.3 - Weight: 600
- H4: 24px / 1.5rem - Line height: 1.4 - Weight: 600
- H5: 20px / 1.25rem - Line height: 1.4 - Weight: 600
- H6: 18px / 1.125rem - Line height: 1.4 - Weight: 600
- Body Large: 18px / 1.125rem - Line height: 1.6 - Weight: 400
- Body: 16px / 1rem - Line height: 1.5 - Weight: 400
- Body Small: 14px / 0.875rem - Line height: 1.5 - Weight: 400
- Caption: 12px / 0.75rem - Line height: 1.4 - Weight: 400
- Overline: 12px / 0.75rem - Line height: 1.4 - Weight: 600 - Letter spacing: 0.5px

**Mobile**
- Display Large: 48px / 3rem - Line height: 1.1 - Weight: 700
- Display: 40px / 2.5rem - Line height: 1.1 - Weight: 700
- H1: 32px / 2rem - Line height: 1.2 - Weight: 700
- H2: 28px / 1.75rem - Line height: 1.3 - Weight: 600
- H3: 24px / 1.5rem - Line height: 1.3 - Weight: 600
- H4: 20px / 1.25rem - Line height: 1.4 - Weight: 600
- H5: 18px / 1.125rem - Line height: 1.4 - Weight: 600
- H6: 16px / 1rem - Line height: 1.4 - Weight: 600
- Body Large: 16px / 1rem - Line height: 1.6 - Weight: 400
- Body: 14px / 0.875rem - Line height: 1.5 - Weight: 400
- Body Small: 12px / 0.75rem - Line height: 1.5 - Weight: 400
- Caption: 11px / 0.6875rem - Line height: 1.4 - Weight: 400

### Font Weights

- Thin: 100 - Rarely used
- Light: 300 - Subtle emphasis
- Regular: 400 - Body text, default
- Medium: 500 - Slight emphasis
- Semibold: 600 - Subheadings, labels
- Bold: 700 - Headings, strong emphasis
- Extrabold: 800 - Display text, hero sections

### Typography Guidelines

**Hierarchy**
- Use size, weight, and color to establish clear hierarchy
- Maintain consistent heading levels (don't skip levels)
- Limit to 3-4 font sizes per screen

**Line Length**
- Optimal: 50-75 characters per line
- Maximum: 90 characters per line
- Use max-width to constrain long text blocks

**Spacing**
- Paragraph spacing: 1em between paragraphs
- Heading spacing: 1.5-2em above, 0.5em below
- List item spacing: 0.5em between items

## Spacing System

### Base Unit

Base spacing unit: 4px (0.25rem)

### Spacing Scale

- xs: 4px / 0.25rem - Tight spacing within components
- sm: 8px / 0.5rem - Small gaps, icon spacing
- md: 12px / 0.75rem - Default component padding
- base: 16px / 1rem - Standard spacing
- lg: 24px / 1.5rem - Section spacing
- xl: 32px / 2rem - Large section spacing
- 2xl: 48px / 3rem - Major section breaks
- 3xl: 64px / 4rem - Page section spacing
- 4xl: 96px / 6rem - Hero sections, large breaks

### Spacing Guidelines

**Component Internal Spacing**
- Button padding: 12px 24px (md horizontal, lg vertical)
- Input padding: 12px 16px
- Card padding: 24px (lg)
- Modal padding: 32px (xl)

**Layout Spacing**
- Between related elements: 8px-16px (sm-base)
- Between sections: 32px-48px (xl-2xl)
- Page margins: 16px mobile, 24px-48px desktop
- Grid gaps: 16px-24px (base-lg)

## Layout System

### Grid System

**12-Column Grid**
- Columns: 12
- Gutter: 24px (desktop), 16px (mobile)
- Max width: 1280px
- Margins: 48px (desktop), 16px (mobile)

**Breakpoints**
- xs: 0px - Mobile portrait
- sm: 640px - Mobile landscape
- md: 768px - Tablet portrait
- lg: 1024px - Tablet landscape / Small desktop
- xl: 1280px - Desktop
- 2xl: 1536px - Large desktop

### Container Widths

- Full width: 100% - Edge-to-edge content
- Wide: 1440px - Wide content areas
- Standard: 1280px - Default max width
- Narrow: 960px - Reading content
- Tight: 640px - Forms, focused content

### Layout Patterns

**App Shell**
- Header: Fixed or sticky, 64px height
- Sidebar: 240px-280px width, collapsible
- Main content: Flexible, centered
- Footer: Variable height, full width

**Card Layouts**
- Single column: Mobile, narrow screens
- 2 columns: Tablet, 768px+
- 3 columns: Desktop, 1024px+
- 4 columns: Large desktop, 1280px+

**Responsive Behavior**
- Mobile-first approach
- Stack vertically on small screens
- Use CSS Grid or Flexbox for flexibility
- Hide/show elements based on screen size
- Adjust spacing proportionally

## Component Design

### Buttons

**Primary Button**
- Background: Primary 500
- Text: White, 14px, weight 600
- Padding: 12px 24px
- Border radius: 8px
- Height: 40px (base), 48px (large), 32px (small)
- Hover: Primary 600 background
- Active: Primary 700 background
- Disabled: Gray 300 background, Gray 500 text
- Focus: 2px outline, Primary 300, 4px offset

**Secondary Button**
- Background: Transparent
- Border: 1px solid Gray 300
- Text: Gray 900, 14px, weight 600
- Padding: 12px 24px
- Border radius: 8px
- Hover: Gray 50 background
- Active: Gray 100 background
- Disabled: Gray 200 background, Gray 400 text

**Tertiary/Ghost Button**
- Background: Transparent
- Text: Primary 500, 14px, weight 600
- Padding: 12px 24px
- Border radius: 8px
- Hover: Primary 50 background
- Active: Primary 100 background
- Disabled: Gray 400 text

**Destructive Button**
- Background: Error 500
- Text: White, 14px, weight 600
- Padding: 12px 24px
- Border radius: 8px
- Hover: Error 600 background
- Active: Error 700 background

**Icon Button**
- Size: 40px × 40px (base), 32px × 32px (small), 48px × 48px (large)
- Icon size: 20px (base), 16px (small), 24px (large)
- Border radius: 8px (square) or 50% (circular)
- Padding: 8px
- Hover: Gray 100 background
- Active: Gray 200 background

**Button States**
- Loading: Show spinner, disable interaction, maintain size
- Success: Brief checkmark animation, then return to normal
- Error: Shake animation, show error state

### Input Fields

**Text Input**
- Height: 40px (base), 48px (large), 32px (small)
- Padding: 12px 16px
- Border: 1px solid Gray 300
- Border radius: 8px
- Font: 14px, weight 400
- Background: White
- Placeholder: Gray 500
- Focus: Primary 500 border, 2px width, Primary 100 background
- Error: Error 500 border, Error 50 background
- Disabled: Gray 100 background, Gray 400 text
- Success: Success 500 border

**Text Area**
- Min height: 80px
- Max height: 400px (with scroll)
- Padding: 12px 16px
- Resize: Vertical only
- All other properties same as text input

**Input with Icon**
- Icon position: Left or right, 16px from edge
- Icon size: 20px
- Icon color: Gray 500
- Input padding adjusted: 40px on icon side

**Input Label**
- Font: 14px, weight 600
- Color: Gray 900
- Margin bottom: 8px
- Required indicator: Red asterisk

**Helper Text**
- Font: 12px, weight 400
- Color: Gray 600
- Margin top: 4px

**Error Message**
- Font: 12px, weight 500
- Color: Error 700
- Icon: Error icon, 16px
- Margin top: 4px

### Search Bar

**Standard Search**
- Height: 40px
- Padding: 12px 16px 12px 44px
- Border: 1px solid Gray 300
- Border radius: 20px (pill shape)
- Search icon: Left side, 20px, Gray 500
- Clear button: Right side, appears when text entered
- Focus: Primary 500 border
- Background: White

**Search with Dropdown**
- Autocomplete suggestions below input
- Max height: 320px with scroll
- Item height: 40px
- Item hover: Gray 50 background
- Selected item: Primary 50 background
- Keyboard navigation support

**Search Results**
- Highlight matching text: Bold or Primary 500 color
- Show result count
- Loading state: Skeleton or spinner
- Empty state: Helpful message and suggestions

### Dropdown / Select

**Select Input**
- Height: 40px
- Padding: 12px 40px 12px 16px
- Border: 1px solid Gray 300
- Border radius: 8px
- Chevron icon: Right side, 20px, Gray 500
- Background: White
- Focus: Primary 500 border
- Disabled: Gray 100 background

**Dropdown Menu**
- Min width: Match trigger width
- Max width: 320px
- Max height: 320px with scroll
- Border: 1px solid Gray 200
- Border radius: 8px
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Background: White
- Padding: 8px 0

**Dropdown Item**
- Height: 40px
- Padding: 12px 16px
- Font: 14px, weight 400
- Hover: Gray 50 background
- Selected: Primary 50 background, Primary 700 text
- Disabled: Gray 400 text, no hover
- Icon: 20px, left aligned with 8px margin

**Multi-Select**
- Checkboxes for each item
- Selected count badge in trigger
- "Select All" option at top
- Clear all button
- Selected items shown as chips in input

**Searchable Dropdown**
- Search input at top of menu
- Filter items as user types
- Show "No results" message when empty
- Highlight matching text

### Checkbox

**Standard Checkbox**
- Size: 20px × 20px
- Border: 2px solid Gray 400
- Border radius: 4px
- Background: White (unchecked), Primary 500 (checked)
- Checkmark: White, 14px
- Hover: Primary 100 background (unchecked)
- Focus: 2px outline, Primary 300
- Disabled: Gray 200 background, Gray 400 border
- Indeterminate: Dash icon instead of checkmark

**Checkbox with Label**
- Label: 14px, weight 400, Gray 900
- Spacing: 8px between checkbox and label
- Clickable area: Entire label and checkbox
- Alignment: Center aligned vertically

**Checkbox Group**
- Vertical spacing: 12px between items
- Group label: 14px, weight 600, margin bottom 8px
- Indentation for nested checkboxes: 24px

### Radio Button

**Standard Radio**
- Size: 20px × 20px
- Border: 2px solid Gray 400
- Border radius: 50% (circular)
- Background: White (unchecked), Primary 500 (checked)
- Inner dot: 10px, White
- Hover: Primary 100 background (unchecked)
- Focus: 2px outline, Primary 300
- Disabled: Gray 200 background, Gray 400 border

**Radio with Label**
- Label: 14px, weight 400, Gray 900
- Spacing: 8px between radio and label
- Clickable area: Entire label and radio
- Alignment: Center aligned vertically

**Radio Group**
- Vertical spacing: 12px between items
- Group label: 14px, weight 600, margin bottom 8px
- Only one selection allowed per group

### Toggle Switch

**Standard Toggle**
- Width: 44px
- Height: 24px
- Border radius: 12px (pill)
- Background: Gray 300 (off), Primary 500 (on)
- Knob: 20px circle, White
- Knob position: 2px from edge
- Transition: 200ms ease
- Hover: Slightly darker background
- Focus: 2px outline, Primary 300
- Disabled: Gray 200 background, Gray 300 knob

**Toggle with Label**
- Label: 14px, weight 500, Gray 900
- Position: Left or right of toggle
- Spacing: 12px between toggle and label

**Toggle Sizes**
- Small: 36px × 20px, knob 16px
- Medium: 44px × 24px, knob 20px (default)
- Large: 52px × 28px, knob 24px

### Slider

**Standard Slider**
- Track height: 4px
- Track color: Gray 300 (inactive), Primary 500 (active)
- Border radius: 2px
- Thumb: 20px circle, Primary 500, White border 2px
- Thumb hover: Scale 1.1
- Thumb active: Scale 1.2
- Focus: 2px outline, Primary 300
- Disabled: Gray 200 track, Gray 400 thumb

**Range Slider**
- Two thumbs for min/max selection
- Active track between thumbs
- Show values above thumbs or at ends

**Slider with Labels**
- Min/max labels at ends
- Current value above thumb or in tooltip
- Step markers below track (optional)

### Pagination

**Standard Pagination**
- Button size: 40px × 40px
- Border radius: 8px
- Font: 14px, weight 500
- Spacing: 4px between buttons
- Current page: Primary 500 background, White text
- Other pages: Transparent background, Gray 700 text
- Hover: Gray 100 background
- Disabled: Gray 400 text, no hover
- Ellipsis: Gray 500, no interaction

**Pagination Layout**
- Previous button: Left arrow icon
- Page numbers: 1, 2, 3, ..., 10
- Next button: Right arrow icon
- Show 5-7 page numbers max
- Always show first and last page

**Pagination Variants**
- Simple: Previous / Next only
- Compact: Page X of Y with arrows
- Full: All page numbers visible
- Infinite scroll: Load more button or auto-load

**Pagination Info**
- Show: "Showing 1-10 of 100 results"
- Font: 14px, Gray 600
- Position: Left side or below pagination

### Progress Indicators

**Progress Bar**
- Height: 8px (thin), 12px (medium), 16px (thick)
- Border radius: 4px
- Background: Gray 200
- Fill: Primary 500
- Animation: Smooth transition, 300ms
- Label: Percentage above or inside bar
- Indeterminate: Animated gradient moving left to right

**Circular Progress**
- Size: 40px (small), 64px (medium), 96px (large)
- Stroke width: 4px (small), 6px (medium), 8px (large)
- Background: Gray 200
- Fill: Primary 500
- Animation: Rotate clockwise
- Label: Percentage in center (optional)

**Step Progress**
- Steps: Circles connected by lines
- Circle size: 32px
- Line height: 2px
- Completed: Primary 500, checkmark icon
- Current: Primary 500, number
- Upcoming: Gray 300, number
- Line: Gray 300 (upcoming), Primary 500 (completed)

**Linear Progress (Indeterminate)**
- Height: 4px
- Background: Gray 200
- Animation: Moving gradient or bar
- Use for unknown duration tasks

### Spinner / Loading

**Circular Spinner**
- Size: 16px (small), 24px (medium), 40px (large)
- Stroke width: 2px (small), 3px (medium), 4px (large)
- Color: Primary 500 (default), White (on dark), Gray 400 (subtle)
- Animation: Rotate 360deg, 1s linear infinite
- Partial circle: 270deg arc

**Dots Spinner**
- 3 dots, 8px each
- Spacing: 4px between dots
- Color: Primary 500
- Animation: Bounce up/down, staggered timing
- Duration: 1.4s infinite

**Pulse Spinner**
- Single circle
- Size: 40px
- Color: Primary 500
- Animation: Scale and fade, 1.5s infinite
- Opacity: 0.2 to 1

**Skeleton Loader**
- Background: Gray 200
- Shimmer: Animated gradient, Gray 100 to Gray 300
- Border radius: Match content shape
- Height: Match content height
- Animation: Move gradient left to right, 1.5s infinite

**Loading States**
- Button loading: Spinner replaces text, button disabled
- Page loading: Full-screen spinner or skeleton
- Section loading: Spinner in section center
- Inline loading: Small spinner next to text

### Toast Notifications

**Toast Container**
- Position: Top-right (default), top-center, bottom-right, bottom-center
- Width: 360px (desktop), 90% (mobile)
- Max width: 480px
- Spacing: 16px from edge, 12px between toasts
- Z-index: 9999

**Toast Design**
- Height: Auto, min 64px
- Padding: 16px
- Border radius: 8px
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
- Background: White
- Border left: 4px solid (status color)

**Toast Types**
- Success: Success 500 border, success icon
- Error: Error 500 border, error icon
- Warning: Warning 500 border, warning icon
- Info: Info 500 border, info icon

**Toast Content**
- Icon: 24px, left aligned
- Title: 14px, weight 600, Gray 900
- Message: 14px, weight 400, Gray 700
- Close button: 20px, top-right, Gray 500
- Action button: Optional, bottom or right

**Toast Behavior**
- Duration: 4s (info), 6s (success), 8s (error), persistent (warning)
- Animation in: Slide from right, 300ms
- Animation out: Fade and slide right, 200ms
- Stack: Max 3 visible, queue others

### Data Tables

**Table Container**
- Border radius: 8px
- Border: 1px solid Gray 200
- Background: White
- Overflow: Auto (horizontal scroll for responsive data)
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.05)

**Table Header**
- Background: Gray 50
- Font: 12px, weight 600, uppercase
- Color: Gray 500
- Padding: 12px 24px
- Border bottom: 1px solid Gray 200
- Alignment: Left for text, right for numbers
- Hover effect on sortable columns

**Table Body / Rows**
- Background: White
- Font: 14px, weight 400
- Color: Gray 900
- Padding: 16px 24px
- Border bottom: 1px solid Gray 200 (except last row)
- Row hover: Gray 50
- Zebra striping: Optional (Gray 50 for alternate rows)
- Active/Selected row: Primary 50 background

**Pagination Area**
- Position: Bottom of table
- Border top: 1px solid Gray 200
- Padding: 12px 24px
- Elements: Rows per page selector, current range text, navigation buttons

### Trend Charts

**Chart Container**
- Border radius: 8px
- Padding: 24px
- Background: White
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.05)

**Axes & Grid**
- Axis lines: Gray 200
- Grid lines: Gray 100, dashed or solid
- Labels: 12px, Gray 500
- Padding: Minimum 10px between labels and grid

**Data Series**
- Line Chart Stroke: 2px - 3px
- Colors: Primary 500, Secondary 500, Info 500, Warning 500
- Data Points: 4px radius on hover
- Fill (Area Chart): Gradient from 20% opacity to 0% at bottom

**Tooltips**
- Background: Gray 900
- Border radius: 4px
- Text: White, 12px
- Padding: 8px 12px
- Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
- Include color indicator dot for the data series

### Modal / Dialog

**Modal Container**
- Width: 480px (small), 640px (medium), 800px (large), 90% (mobile)
- Max width: 90vw
- Max height: 90vh
- Border radius: 12px
- Background: White
- Shadow: 0 20px 40px rgba(0, 0, 0, 0.3)
- Position: Center of screen

**Modal Overlay**
- Background: rgba(0, 0, 0, 0.5)
- Backdrop blur: 4px (optional)
- Z-index: 9998

**Modal Header**
- Padding: 24px 24px 16px
- Title: 20px, weight 600, Gray 900
- Close button: 24px, top-right, Gray 500
- Border bottom: 1px solid Gray 200 (optional)

**Modal Body**
- Padding: 16px 24px
- Max height: 60vh
- Overflow: Auto with scroll
- Font: 14px, Gray 700

**Modal Footer**
- Padding: 16px 24px 24px
- Border top: 1px solid Gray 200 (optional)
- Buttons: Right aligned, 12px spacing
- Primary action: Right-most position

**Modal Animations**
- Open: Fade in overlay (200ms), scale up modal (300ms)
- Close: Scale down modal (200ms), fade out overlay (300ms)
- Backdrop click: Close modal (configurable)
- Escape key: Close modal

**Modal Variants**
- Alert: Single action, no close button
- Confirm: Two actions (confirm/cancel)
- Form: Input fields with submit/cancel
- Full-screen: 100vw × 100vh on mobile

### Popover / Tooltip

**Tooltip**
- Max width: 240px
- Padding: 8px 12px
- Border radius: 6px
- Background: Gray 900
- Text: White, 12px, weight 400
- Arrow: 6px, matches background
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.15)
- Delay: 500ms before show, 0ms hide
- Position: Auto (top, bottom, left, right)

**Popover**
- Width: 280px (default), configurable
- Max width: 360px
- Padding: 16px
- Border radius: 8px
- Background: White
- Border: 1px solid Gray 200
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Arrow: 8px, matches background and border
- Position: Auto with flip

**Popover Content**
- Title: 14px, weight 600, Gray 900
- Body: 14px, weight 400, Gray 700
- Actions: Buttons at bottom
- Close button: Optional, top-right

### Tabs

**Horizontal Tabs**
- Tab height: 48px
- Tab padding: 12px 24px
- Font: 14px, weight 500
- Inactive: Gray 600 text, transparent background
- Active: Primary 500 text, Primary 500 bottom border (2px)
- Hover: Gray 100 background
- Disabled: Gray 400 text, no interaction
- Indicator: Animated slide, 300ms

**Vertical Tabs**
- Tab width: 200px
- Tab height: 40px
- Tab padding: 12px 16px
- Active: Primary 50 background, Primary 500 left border (3px)
- Layout: Tabs on left, content on right

**Tab Variants**
- Underline: Border bottom only (default)
- Pills: Rounded background for active tab
- Boxed: Border around entire tab bar
- Icon tabs: Icon + text or icon only

**Tab Behavior**
- Keyboard navigation: Arrow keys to switch
- Scroll: Horizontal scroll if tabs overflow
- Mobile: Stack vertically or horizontal scroll

### Navigation

**Top Navigation Bar**
- Height: 64px
- Background: White or Primary 900
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Padding: 0 24px
- Logo: Left aligned, 32px height
- Links: Center or right aligned
- Actions: Right aligned (search, profile, notifications)

**Navigation Links**
- Font: 14px, weight 500
- Spacing: 24px between links
- Hover: Primary 500 color or underline
- Active: Primary 500 color, bold
- Mobile: Hamburger menu, slide-in drawer

**Sidebar Navigation**
- Width: 240px (expanded), 64px (collapsed)
- Background: Gray 50 or Gray 900
- Item height: 40px
- Item padding: 12px 16px
- Icon: 20px, left aligned
- Active: Primary 50 background, Primary 500 left border
- Hover: Gray 100 background
- Collapse button: Bottom of sidebar

**Breadcrumbs**
- Font: 14px, weight 400
- Color: Gray 600
- Separator: "/" or ">" or chevron icon
- Current page: Gray 900, not clickable
- Hover: Primary 500 color
- Max items: Show last 3 + home, collapse middle

**Footer Navigation**
- Background: Gray 900
- Text: Gray 300
- Links: Gray 400, hover Gray 100
- Layout: Multi-column on desktop, stacked on mobile
- Padding: 48px 24px

### Cards

**Standard Card**
- Border radius: 12px
- Background: White
- Border: 1px solid Gray 200
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Padding: 24px
- Hover: Shadow 0 4px 12px rgba(0, 0, 0, 0.15), lift 2px

**Card Header**
- Padding: 24px 24px 16px
- Title: 18px, weight 600, Gray 900
- Subtitle: 14px, weight 400, Gray 600
- Actions: Right aligned (icon buttons)
- Border bottom: 1px solid Gray 200 (optional)

**Card Body**
- Padding: 16px 24px
- Font: 14px, Gray 700
- Images: Full width or inline
- Lists: Styled appropriately

**Card Footer**
- Padding: 16px 24px 24px
- Border top: 1px solid Gray 200 (optional)
- Actions: Right aligned buttons
- Meta info: Left aligned, Gray 600

**Card Variants**
- Elevated: Larger shadow, no border
- Outlined: Border only, no shadow
- Filled: Colored background
- Interactive: Clickable, hover effects
- Horizontal: Image left, content right

### Tables

**Table Container**
- Border: 1px solid Gray 200
- Border radius: 8px
- Background: White
- Overflow: Auto with horizontal scroll

**Table Header**
- Background: Gray 50
- Font: 14px, weight 600, Gray 900
- Padding: 12px 16px
- Border bottom: 2px solid Gray 300
- Sticky: Top 0 on scroll
- Sort icons: 16px, right aligned

**Table Row**
- Height: 48px (compact), 56px (default), 64px (comfortable)
- Padding: 12px 16px
- Border bottom: 1px solid Gray 200
- Hover: Gray 50 background
- Selected: Primary 50 background
- Striped: Alternate Gray 50 background (optional)

**Table Cell**
- Font: 14px, weight 400, Gray 700
- Alignment: Left (text), right (numbers), center (actions)
- Truncate: Ellipsis for long text
- Wrap: Optional, increases row height

**Table Actions**
- Row actions: Icon buttons, right aligned
- Bulk actions: Toolbar above table
- Checkbox: Left-most column for selection
- Expandable rows: Chevron icon, nested content

**Table Features**
- Sorting: Click header to sort, show indicator
- Filtering: Filter inputs above columns
- Pagination: Below table
- Empty state: Centered message and icon
- Loading: Skeleton rows or spinner overlay

### Charts & Data Visualization

**Color Palette for Charts**
- Primary series: Primary 500, Secondary 500, Success 500, Warning 500, Error 500
- Extended: Info 500, Purple 500, Pink 500, Teal 500, Orange 500
- Gradients: Light to dark of same hue
- Accessibility: Ensure sufficient contrast, use patterns for colorblind users

**Line Chart**
- Line width: 2px
- Point size: 6px (hover: 8px)
- Grid lines: Gray 200, 1px
- Axis labels: 12px, Gray 600
- Legend: Top or bottom, 14px
- Tooltip: Show on hover, values and labels

**Bar Chart**
- Bar width: Auto based on data points
- Bar spacing: 8px between bars, 24px between groups
- Border radius: 4px top corners
- Hover: Slightly darker shade
- Axis: Same as line chart
- Horizontal or vertical orientation

**Pie/Donut Chart**
- Stroke width: 0 (pie), 40px (donut)
- Hover: Pull out slice slightly
- Labels: Outside with leader lines or inside
- Legend: Right side or bottom
- Center label: Total or selected value (donut)

**Area Chart**
- Fill opacity: 0.2-0.3
- Line: Same as line chart
- Stacked or overlapping
- Gradient fill: Optional

**Chart Container**
- Background: White or transparent
- Padding: 24px
- Border radius: 8px
- Responsive: Scale to container width
- Min height: 300px

**Chart Interactions**
- Hover: Highlight data point, show tooltip
- Click: Select/deselect, drill down
- Zoom: Pinch or scroll to zoom
- Pan: Drag to pan on zoomed chart
- Legend: Click to show/hide series

### Badges & Tags

**Badge**
- Height: 20px (small), 24px (medium)
- Padding: 4px 8px
- Border radius: 12px (pill)
- Font: 12px, weight 600
- Colors: Match semantic colors
- Position: Top-right of parent (notification badge)

**Badge Variants**
- Default: Gray 100 background, Gray 700 text
- Primary: Primary 100 background, Primary 700 text
- Success: Success 100 background, Success 700 text
- Warning: Warning 100 background, Warning 700 text
- Error: Error 100 background, Error 700 text
- Dot: Small circle, no text

**Tag/Chip**
- Height: 32px
- Padding: 8px 12px
- Border radius: 16px
- Font: 14px, weight 500
- Border: 1px solid Gray 300
- Background: White
- Remove icon: 16px, right side, 4px margin

**Tag Variants**
- Filled: Colored background, no border
- Outlined: Border only, transparent background
- Clickable: Hover effect, cursor pointer
- Removable: X icon on right
- With avatar: Small avatar on left

### Avatars

**Avatar Sizes**
- xs: 24px - Inline mentions, small lists
- sm: 32px - Comments, compact lists
- md: 40px - Default, most common use
- lg: 64px - Profile headers, cards
- xl: 96px - Profile pages, large displays
- 2xl: 128px - Hero sections

**Avatar Styles**
- Circular: Border radius 50% (default)
- Rounded: Border radius 8px
- Square: Border radius 0

**Avatar Content**
- Image: User photo, object-fit cover
- Initials: 1-2 letters, centered, weight 600
- Icon: Default user icon
- Placeholder: Colored background with initials

**Avatar Colors (for initials)**
- Generate from name hash
- Use primary, secondary, success, info, warning colors
- Ensure good contrast with white text

**Avatar Group**
- Overlap: -8px (small), -12px (medium)
- Max visible: 3-5, show "+N" for remaining
- Border: 2px white border between avatars
- Z-index: Decrease for each avatar
- Hover: Lift hovered avatar

**Avatar Badge**
- Size: 25% of avatar size
- Position: Bottom-right corner
- Border: 2px white
- Colors: Success (online), Gray (offline), Warning (away), Error (busy)

### Accordion

**Accordion Container**
- Border: 1px solid Gray 200
- Border radius: 8px
- Background: White
- Spacing: 0 between items (shared borders)

**Accordion Item**
- Border bottom: 1px solid Gray 200 (except last)
- Background: White
- Hover: Gray 50 background

**Accordion Header**
- Height: 56px
- Padding: 16px 24px
- Font: 16px, weight 600, Gray 900
- Cursor: Pointer
- Icon: Chevron right (collapsed), chevron down (expanded)
- Icon position: Right side, 20px
- Transition: 200ms

**Accordion Content**
- Padding: 0 24px 24px
- Font: 14px, Gray 700
- Animation: Slide down/up, 300ms
- Max height: Transition from 0 to auto

**Accordion Variants**
- Single: Only one item open at a time
- Multiple: Multiple items can be open
- Borderless: No borders, spacing between items
- Filled: Colored header background

### Lists

**Simple List**
- Item height: 40px (compact), 48px (default), 56px (comfortable)
- Padding: 12px 16px
- Border bottom: 1px solid Gray 200
- Hover: Gray 50 background
- Font: 14px, Gray 700

**List with Icons**
- Icon: 20px, left aligned, 12px margin right
- Icon color: Gray 500 or semantic color
- Alignment: Center vertically

**List with Avatars**
- Avatar: 40px, left aligned
- Primary text: 14px, weight 500, Gray 900
- Secondary text: 12px, Gray 600
- Spacing: 12px between avatar and text

**List with Actions**
- Actions: Right aligned
- Icon buttons: 32px, appear on hover
- Spacing: 8px between action buttons

**Nested List**
- Indentation: 24px per level
- Max depth: 3 levels
- Collapse icon: Chevron, rotates on expand

**Dividers**
- Height: 1px
- Color: Gray 200
- Margin: 8px 0 (small), 16px 0 (medium)
- Full width or inset (16px from left)

### Menu

**Menu Container**
- Min width: 180px
- Max width: 320px
- Border radius: 8px
- Background: White
- Border: 1px solid Gray 200
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Padding: 8px 0

**Menu Item**
- Height: 40px
- Padding: 12px 16px
- Font: 14px, weight 400, Gray 700
- Hover: Gray 50 background
- Active: Primary 50 background, Primary 700 text
- Disabled: Gray 400 text, no hover
- Icon: 20px, left aligned, 8px margin

**Menu Divider**
- Height: 1px
- Background: Gray 200
- Margin: 8px 0

**Menu Group**
- Label: 12px, weight 600, Gray 500, uppercase
- Padding: 8px 16px 4px
- Items: Grouped below label

**Submenu**
- Indicator: Chevron right icon
- Opens on hover or click
- Position: Right side, slight overlap
- Same styling as parent menu

## Animation & Motion

### Animation Principles

**Purpose**: Every animation should have a clear purpose
- Provide feedback to user actions
- Guide attention to important changes
- Show relationships between elements
- Indicate system status
- Add delight without distraction

**Duration Guidelines**
- Micro-interactions: 100-200ms - Button clicks, toggles
- Small elements: 200-300ms - Dropdowns, tooltips
- Medium elements: 300-400ms - Modals, drawers
- Large elements: 400-500ms - Page transitions
- Complex animations: 500-800ms - Multi-step sequences

**Easing Functions**
- Ease-out: Fast start, slow end - Entering elements
- Ease-in: Slow start, fast end - Exiting elements
- Ease-in-out: Slow start and end - Moving elements
- Linear: Constant speed - Loading spinners, progress
- Spring: Bouncy, natural - Playful interactions

### Common Animations

**Fade**
- Fade in: Opacity 0 → 1, 200ms ease-out
- Fade out: Opacity 1 → 0, 200ms ease-in
- Usage: Tooltips, overlays, content changes

**Slide**
- Slide in: Transform translateX/Y, 300ms ease-out
- Slide out: Transform translateX/Y, 200ms ease-in
- Usage: Drawers, notifications, mobile menus

**Scale**
- Scale up: Transform scale(0.95) → scale(1), 200ms ease-out
- Scale down: Transform scale(1) → scale(0.95), 200ms ease-in
- Usage: Modals, popovers, zoom effects

**Rotate**
- Rotate: Transform rotate(0deg) → rotate(180deg), 300ms ease-in-out
- Usage: Chevrons, expand/collapse icons, loading spinners

**Bounce**
- Keyframes: Scale 1 → 1.1 → 0.9 → 1, 400ms
- Usage: Success confirmations, attention grabbers

**Shake**
- Keyframes: TranslateX 0 → -10px → 10px → 0, 400ms
- Usage: Error states, invalid inputs

**Pulse**
- Keyframes: Scale 1 → 1.05 → 1, opacity 1 → 0.8 → 1, 1500ms infinite
- Usage: Notifications, attention indicators

### Interaction Animations

**Button Press**
- Scale: 1 → 0.98, 100ms
- Shadow: Reduce on press
- Return: 100ms ease-out

**Hover Effects**
- Lift: TranslateY 0 → -2px, shadow increase, 200ms
- Glow: Box-shadow spread, 200ms
- Color shift: Background color change, 200ms

**Loading States**
- Skeleton shimmer: Gradient animation, 1500ms infinite
- Spinner rotation: 360deg, 1000ms linear infinite
- Progress bar: Width increase, 300ms ease-out
- Dots: Staggered bounce, 1400ms infinite

**Page Transitions**
- Fade: Current page fade out, new page fade in
- Slide: Current page slide out, new page slide in
- Cross-fade: Overlap with opacity transition
- Duration: 300-400ms

### Micro-interactions

**Form Validation**
- Success: Checkmark icon fade in, green border, 200ms
- Error: Shake animation, red border, error message slide down
- Real-time: Debounce 500ms, then validate

**Toggle Switch**
- Knob slide: 200ms ease-out
- Background color: 200ms ease-out
- Haptic feedback: On mobile devices

**Checkbox/Radio**
- Checkmark: Scale from 0 to 1, 200ms ease-out
- Background: Color transition, 200ms
- Ripple effect: Optional, 400ms fade out

**Dropdown Open**
- Menu: Fade in + scale up from top, 200ms
- Arrow: Rotate 180deg, 200ms
- Items: Stagger fade in, 50ms delay each

**Notification Toast**
- Enter: Slide in from right + fade in, 300ms
- Exit: Slide out right + fade out, 200ms
- Progress bar: Width decrease over duration

**Like/Favorite**
- Heart: Scale up 1 → 1.3 → 1, color change, 400ms
- Particles: Optional burst animation
- Haptic: Light impact on mobile

### Performance Considerations

**Optimize Animations**
- Use transform and opacity (GPU accelerated)
- Avoid animating: width, height, top, left, margin
- Use will-change for complex animations
- Remove will-change after animation completes

**Reduce Motion**
- Respect prefers-reduced-motion media query
- Disable decorative animations
- Keep functional animations (loading, feedback)
- Reduce duration and remove bounces

**Animation Best Practices**
- Test on low-end devices
- Limit simultaneous animations
- Use requestAnimationFrame for JS animations
- Debounce scroll and resize animations
- Provide skip/fast-forward options for long animations

## Elevation & Shadows

### Shadow Levels

**Level 0 (None)**
- Shadow: none
- Usage: Flat design, inline elements

**Level 1 (Subtle)**
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Usage: Cards, buttons, subtle elevation

**Level 2 (Low)**
- Shadow: 0 2px 6px rgba(0, 0, 0, 0.12)
- Usage: Hover states, raised cards

**Level 3 (Medium)**
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
- Usage: Dropdowns, popovers, floating elements

**Level 4 (High)**
- Shadow: 0 8px 24px rgba(0, 0, 0, 0.18)
- Usage: Modals, important floating elements

**Level 5 (Highest)**
- Shadow: 0 16px 48px rgba(0, 0, 0, 0.22)
- Usage: Full-screen overlays, critical modals

### Shadow Usage

**Elevation Hierarchy**
- Base layer: No shadow (background)
- Content layer: Level 1 (cards, panels)
- Floating layer: Level 3 (dropdowns, tooltips)
- Modal layer: Level 4-5 (modals, dialogs)

**Interactive Shadows**
- Rest: Base shadow level
- Hover: Increase by 1 level
- Active: Decrease by 1 level
- Transition: 200ms ease-out

**Colored Shadows**
- Primary: 0 4px 12px rgba(37, 99, 235, 0.2)
- Success: 0 4px 12px rgba(34, 197, 94, 0.2)
- Error: 0 4px 12px rgba(239, 68, 68, 0.2)
- Usage: Highlight important elements, brand emphasis

## Border Radius

### Radius Scale

- None: 0px - Sharp corners, formal
- xs: 2px - Subtle rounding
- sm: 4px - Slight rounding
- md: 8px - Default, most components
- lg: 12px - Cards, larger elements
- xl: 16px - Prominent elements
- 2xl: 24px - Hero sections, large cards
- Full: 9999px - Pills, circular elements

### Radius Usage

**Components**
- Buttons: 8px (md)
- Inputs: 8px (md)
- Cards: 12px (lg)
- Modals: 12px (lg)
- Badges: 9999px (full)
- Avatars: 50% (circular) or 8px (rounded)
- Images: 8px (md) or 12px (lg)
- Dropdowns: 8px (md)

**Consistency**
- Use same radius for related components
- Larger elements can have larger radius
- Inner elements should have smaller radius than container

## Icons

### Icon System

**Icon Library**
- Recommended: Heroicons, Lucide, Feather Icons, Material Icons
- Style: Outline (default), Solid (emphasis), Duotone (special)
- Format: SVG for scalability and customization

**Icon Sizes**
- xs: 12px - Inline with small text
- sm: 16px - Inline with body text
- md: 20px - Default, buttons, inputs
- lg: 24px - Larger buttons, headings
- xl: 32px - Feature icons, empty states
- 2xl: 48px - Hero sections, large displays

**Icon Colors**
- Default: Gray 500 - Neutral icons
- Primary: Primary 500 - Brand icons
- Success: Success 500 - Positive actions
- Warning: Warning 500 - Caution
- Error: Error 500 - Destructive actions
- Inherit: currentColor - Match text color

### Icon Usage

**With Text**
- Spacing: 8px between icon and text
- Alignment: Center vertically
- Size: Match text size or slightly larger

**Icon Buttons**
- Padding: 8px (32px total for 16px icon)
- Touch target: Minimum 44px × 44px
- Hover: Background color change
- Active: Slightly darker background

**Icon Guidelines**
- Use consistent style throughout app
- Provide alt text for accessibility
- Don't mix different icon styles
- Use semantic icons (trash for delete, pencil for edit)
- Test icon clarity at small sizes

## Responsive Design

### Mobile-First Approach

**Breakpoint Strategy**
- Design for mobile first (320px+)
- Progressively enhance for larger screens
- Test on actual devices, not just browser resize

**Mobile Optimizations**
- Touch targets: Minimum 44px × 44px
- Font sizes: Slightly smaller but readable
- Spacing: Reduced but not cramped
- Navigation: Hamburger menu or bottom tabs
- Forms: Full-width inputs, large buttons
- Images: Optimized sizes, lazy loading

**Tablet Considerations**
- Hybrid layouts: Between mobile and desktop
- Utilize extra space without looking empty
- Support both portrait and landscape
- Consider split-screen multitasking

**Desktop Enhancements**
- Multi-column layouts
- Hover states and tooltips
- Keyboard shortcuts
- Larger content areas
- Side-by-side comparisons

### Touch vs Mouse

**Touch Interactions**
- Larger touch targets (44px minimum)
- No hover states (use active states)
- Swipe gestures for navigation
- Pull-to-refresh
- Long-press for context menus
- Haptic feedback

**Mouse Interactions**
- Smaller click targets acceptable (32px)
- Hover states for feedback
- Right-click context menus
- Drag and drop
- Tooltips on hover
- Cursor changes (pointer, grab, etc.)

**Hybrid Support**
- Detect input method
- Support both touch and mouse
- Adjust UI based on primary input
- Test with both interaction methods

## Empty States

### Empty State Design

**Container**
- Center aligned content
- Max width: 400px
- Padding: 48px 24px
- Background: Transparent or subtle color

**Illustration**
- Size: 120px-200px
- Style: Match brand (line art, flat, 3D)
- Color: Subtle, not distracting
- Position: Above text

**Icon Alternative**
- Size: 48px-64px
- Color: Gray 400
- Simple, recognizable icon

**Heading**
- Font: 20px, weight 600, Gray 900
- Message: Clear, concise explanation
- Margin: 16px below illustration

**Description**
- Font: 14px, weight 400, Gray 600
- Details: Why empty, what to do next
- Max width: 320px
- Margin: 8px below heading

**Action Button**
- Primary button
- Clear call-to-action
- Margin: 24px above button

**Empty State Types**
- First use: Welcome, guide user to first action
- No results: Search/filter returned nothing
- No data: User hasn't created content yet
- Error: Something went wrong
- Completed: All tasks done, inbox zero

## Error States

### Error Message Design

**Inline Errors**
- Position: Below input field
- Icon: Error icon, 16px
- Color: Error 700
- Font: 12px, weight 500
- Animation: Slide down, 200ms

**Form Errors**
- Summary: Top of form, list all errors
- Links: Jump to error field on click
- Highlight: Error border on invalid fields
- Persist: Until user corrects

**Page Errors**
- 404: Page not found
- 500: Server error
- 403: Access denied
- Offline: No internet connection

**Error Page Layout**
- Center aligned
- Error code: Large, 72px, Gray 300
- Heading: 24px, weight 600, Gray 900
- Message: 16px, Gray 600, explain issue
- Actions: Go home, go back, contact support
- Illustration: Optional, friendly

**Error Recovery**
- Provide clear next steps
- Offer alternative actions
- Include contact/support option
- Auto-retry for transient errors
- Save user data when possible

## Accessibility Guidelines

### WCAG Compliance

**Level AA Requirements** (Target)
- Color contrast: 4.5:1 for text, 3:1 for large text
- Keyboard navigation: All interactive elements
- Focus indicators: Visible on all focusable elements
- Alt text: All images and icons
- Form labels: Associated with inputs
- Heading hierarchy: Logical structure
- Link purpose: Clear from text or context

**Testing Tools**
- Automated: axe DevTools, Lighthouse, WAVE
- Manual: Keyboard navigation, screen reader
- Color: Contrast checkers, colorblind simulators

### Keyboard Navigation

**Tab Order**
- Logical flow: Left to right, top to bottom
- Skip links: Jump to main content
- Focus trap: In modals and dialogs
- Visible focus: Clear indicator on all elements

**Keyboard Shortcuts**
- Common patterns: Enter (submit), Escape (close), Arrow keys (navigate)
- Document shortcuts: Provide help/reference
- Avoid conflicts: Don't override browser shortcuts
- Provide alternatives: Don't rely solely on shortcuts

### Screen Reader Support

**Semantic HTML**
- Use proper elements: button, nav, main, article
- Heading levels: h1-h6 in order
- Lists: ul, ol for list content
- Tables: th, caption for data tables

**ARIA Attributes**
- aria-label: Label for icon buttons
- aria-describedby: Additional descriptions
- aria-live: Announce dynamic content
- aria-expanded: Collapsible sections
- aria-selected: Selected items
- aria-hidden: Hide decorative elements

**Screen Reader Testing**
- Test with: NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS)
- Verify: All content readable, navigation clear, forms usable
- Announce: Dynamic changes, errors, success messages

### Focus Management

**Focus Indicators**
- Visible: 2px outline, high contrast color
- Consistent: Same style throughout
- Not removed: Never use outline: none without replacement
- Enhanced: Larger, more visible than browser default

**Focus Order**
- Logical: Matches visual order
- Skip navigation: Link to main content
- Modal focus: Trap focus inside modal
- Return focus: To trigger element after modal closes

## Dark Mode

### Color Adaptations

**Background Colors**
- Primary: #111827 (Gray 900)
- Secondary: #1F2937 (Gray 800)
- Tertiary: #374151 (Gray 700)
- Surface: #1F2937 (Gray 800)

**Text Colors**
- Primary: #F9FAFB (Gray 50)
- Secondary: #E5E7EB (Gray 200)
- Tertiary: #D1D5DB (Gray 300)
- Disabled: #6B7280 (Gray 500)

**Border Colors**
- Default: #374151 (Gray 700)
- Subtle: #4B5563 (Gray 600)
- Strong: #6B7280 (Gray 500)

**Semantic Colors (Dark Mode)**
- Adjust brightness: Slightly lighter than light mode
- Maintain contrast: Ensure readability
- Primary: #3B82F6 (Primary 600)
- Success: #10B981 (Success 600)
- Warning: #F59E0B (Warning 500)
- Error: #EF4444 (Error 500)

### Dark Mode Implementation

**Toggle**
- Position: User settings or header
- Icon: Sun/moon icon
- Persist: Save preference to localStorage
- System: Respect prefers-color-scheme

**Transition**
- Smooth: 200ms color transition
- All elements: Consistent timing
- No flash: Load saved preference immediately

**Images & Media**
- Reduce brightness: 80-90% opacity
- Invert: Some icons and logos
- Separate assets: Different images for dark mode
- Overlays: Subtle dark overlay on bright images

**Shadows**
- Lighter: Use lighter shadows or remove
- Borders: Add subtle borders instead
- Elevation: Less pronounced in dark mode

### Dark Mode Best Practices

**Contrast**
- Higher contrast: Text more readable
- Test: Ensure 4.5:1 ratio maintained
- Avoid: Pure black (#000000), use dark gray

**Colors**
- Desaturate: Slightly less saturated colors
- Avoid: Bright, vibrant colors that strain eyes
- Test: View in low light conditions

**Consistency**
- All screens: Support dark mode everywhere
- Components: All components have dark variants
- Third-party: Ensure libraries support dark mode

## Mobile-Specific Patterns

### Mobile Navigation

**Bottom Navigation**
- Height: 56px
- Items: 3-5 items maximum
- Icon: 24px, centered
- Label: 12px, below icon (optional)
- Active: Primary 500 color
- Inactive: Gray 500 color
- Background: White with top border or shadow

**Hamburger Menu**
- Icon: 24px, top-left or top-right
- Drawer: Slide in from left, 280px width
- Overlay: Semi-transparent backdrop
- Close: Tap outside, close button, or swipe
- Animation: 300ms slide

**Tab Bar (iOS Style)**
- Height: 49px (iOS standard)
- Items: 5 items maximum
- Icon: 25px, centered
- Label: 10px, below icon
- Badge: Notification count, top-right
- Safe area: Respect bottom safe area

### Mobile Gestures

**Swipe**
- Swipe to delete: List items
- Swipe to navigate: Between screens, carousel
- Swipe to refresh: Pull down at top
- Swipe to dismiss: Modals, notifications

**Pull to Refresh**
- Trigger: Pull down 80px
- Indicator: Spinner or custom animation
- Feedback: Haptic on trigger
- Animation: Smooth spring animation

**Long Press**
- Duration: 500ms
- Feedback: Haptic vibration
- Action: Context menu, reorder mode
- Visual: Slight scale or shadow

**Pinch to Zoom**
- Images: Zoom in/out
- Maps: Zoom in/out
- Min/max: Set reasonable limits
- Smooth: 60fps animation

### Mobile Forms

**Input Optimization**
- Type: Use appropriate input types (email, tel, number)
- Autocomplete: Enable for common fields
- Autofocus: First field on form load
- Keyboard: Dismiss on submit or tap outside

**Keyboard Types**
- Email: Email keyboard with @
- Phone: Number pad with symbols
- Number: Number pad only
- URL: URL keyboard with .com
- Search: Search button instead of return

**Form Layout**
- Full width: Inputs span full width
- Spacing: Generous spacing between fields
- Labels: Above inputs, not floating
- Buttons: Full width, fixed at bottom

### Mobile Modals

**Full-Screen Modal**
- Height: 100vh
- Header: Fixed at top, 56px
- Close: X button or back arrow, top-left
- Content: Scrollable
- Actions: Fixed at bottom or in header

**Bottom Sheet**
- Position: Slide up from bottom
- Height: Auto or 50%, 75%, 90%
- Handle: Drag handle at top, 32px wide, 4px tall
- Dismiss: Swipe down, tap outside, close button
- Backdrop: Semi-transparent overlay

**Action Sheet (iOS Style)**
- Position: Bottom of screen
- Options: List of actions
- Cancel: Separate button at bottom
- Destructive: Red text for dangerous actions
- Dismiss: Tap cancel or outside

### Mobile Performance

**Optimization**
- Images: Responsive images, lazy loading
- Fonts: Subset fonts, preload critical fonts
- Code: Code splitting, lazy load routes
- Animations: Use transform and opacity
- Scroll: Passive event listeners

**Loading**
- Skeleton: Show content structure
- Progressive: Load critical content first
- Offline: Cache for offline access
- Feedback: Show loading indicators

**Touch Response**
- Immediate: Visual feedback on touch
- Haptic: Vibration for important actions
- Debounce: Prevent double-tap issues
- Cancel: Allow touch cancel by dragging away

## Design Tokens

### Token Structure

Design tokens are the single source of truth for design decisions. They should be defined once and used throughout the application.

**Color Tokens**
```
--color-primary-50: #EFF6FF
--color-primary-500: #2563EB
--color-primary-900: #0A2540
--color-gray-50: #F9FAFB
--color-gray-900: #111827
```

**Spacing Tokens**
```
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-base: 16px
--spacing-lg: 24px
--spacing-xl: 32px
```

**Typography Tokens**
```
--font-family-sans: Inter, system-ui, sans-serif
--font-size-sm: 14px
--font-size-base: 16px
--font-size-lg: 18px
--font-weight-normal: 400
--font-weight-semibold: 600
--font-weight-bold: 700
--line-height-tight: 1.25
--line-height-normal: 1.5
```

**Border Radius Tokens**
```
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-full: 9999px
```

**Shadow Tokens**
```
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.18)
```

### Token Implementation

**CSS Variables**
```css
:root {
  /* Colors */
  --color-primary: #2563EB;
  --color-text: #111827;
  --color-background: #FFFFFF;
  
  /* Spacing */
  --spacing-unit: 4px;
  --spacing-base: calc(var(--spacing-unit) * 4);
  
  /* Typography */
  --font-size-base: 16px;
  --line-height-base: 1.5;
}

[data-theme="dark"] {
  --color-text: #F9FAFB;
  --color-background: #111827;
}
```

**JavaScript/TypeScript**
```typescript
export const tokens = {
  colors: {
    primary: {
      50: '#EFF6FF',
      500: '#2563EB',
      900: '#0A2540',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    base: '16px',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
    },
    fontSize: {
      sm: '14px',
      base: '16px',
    },
  },
};
```

**Tailwind Config**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          500: '#2563EB',
          900: '#0A2540',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
      },
    },
  },
};
```

## Component Library

### Building a Component Library

**Structure**
- Atomic components: Buttons, inputs, icons
- Composite components: Forms, cards, modals
- Layout components: Grid, container, stack
- Utility components: Portal, transition, focus trap

**Documentation**
- Storybook: Interactive component playground
- Props: Document all props with types
- Examples: Show common use cases
- Accessibility: Document keyboard and screen reader support
- Guidelines: When and how to use each component

**Versioning**
- Semantic versioning: Major.minor.patch
- Changelog: Document all changes
- Migration guides: Help upgrade between versions
- Deprecation: Warn before removing features

**Testing**
- Unit tests: Test component logic
- Visual regression: Catch visual changes
- Accessibility: Automated a11y tests
- Integration: Test component interactions

## Design Handoff

### Designer to Developer

**Design Files**
- Figma/Sketch: Organized, named layers
- Components: Reusable, documented
- Styles: Use design tokens
- Prototypes: Show interactions and flows
- Specs: Spacing, sizing, colors clearly marked

**Documentation**
- Design system: Link to design system docs
- Interactions: Document hover, active, focus states
- Responsive: Show mobile, tablet, desktop layouts
- Edge cases: Empty states, errors, loading
- Accessibility: Note ARIA labels, keyboard navigation

**Assets**
- Icons: SVG format, optimized
- Images: Multiple sizes, optimized
- Fonts: Web fonts, license checked
- Animations: Lottie files or video references

**Communication**
- Annotations: Explain complex interactions
- Comments: Use Figma/Sketch comments
- Meetings: Walkthrough for complex features
- Feedback: Iterate based on technical constraints

### Developer to Designer

**Feedback**
- Technical constraints: Inform about limitations
- Performance: Discuss heavy animations or images
- Accessibility: Highlight a11y issues
- Consistency: Point out deviations from design system

**Implementation**
- Staging: Share staging links for review
- Screenshots: Show implementation progress
- Edge cases: Ask about unspecified scenarios
- Refinements: Suggest improvements during development

## Conclusion

This design guide provides comprehensive specifications for building consistent, accessible, and delightful user interfaces. Use these guidelines as a foundation, but adapt them to your specific product needs and brand identity.

### Key Takeaways

**Consistency is Key**
- Use design tokens throughout
- Follow established patterns
- Maintain visual hierarchy
- Keep spacing and sizing consistent

**Accessibility First**
- Design for all users from the start
- Test with keyboard and screen readers
- Ensure sufficient color contrast
- Provide clear focus indicators

**Performance Matters**
- Optimize images and assets
- Use efficient animations
- Test on low-end devices
- Implement progressive enhancement

**User-Centered Design**
- Provide clear feedback
- Handle errors gracefully
- Show loading states
- Design for empty states

**Iterate and Improve**
- Gather user feedback
- Test with real users
- Measure and analyze
- Continuously refine

### Resources

**Design Tools**
- Figma: Collaborative design tool
- Sketch: Mac design tool
- Adobe XD: Design and prototyping
- Framer: Interactive prototyping

**Development Tools**
- Storybook: Component development
- Chromatic: Visual testing
- Tailwind CSS: Utility-first CSS
- Styled Components: CSS-in-JS

**Testing Tools**
- axe DevTools: Accessibility testing
- Lighthouse: Performance and a11y audits
- BrowserStack: Cross-browser testing
- Percy: Visual regression testing

**Learning Resources**
- Material Design: Google's design system
- Human Interface Guidelines: Apple's design principles
- Inclusive Components: Accessible component patterns
- Laws of UX: Psychology principles for design

For questions, updates, or contributions to this design guide, consult with your design team and maintain this document as a living resource that evolves with your product.
