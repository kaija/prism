# Dashlot Frontend Design System Guide

## Introduction

This design guide establishes visual and interaction standards for the applications based on the Dashlot theme's UI elements and Bootstrap parameters. It follows the structural requirements of the standard design template to ensure consistency across both light and dark modes.

## Color Palette

### Primary Colors

**Brand Primary**
- Primary Base: `rgb(74, 119, 240)` (#4a77f0)
- Primary Hover (0.9 opacity): `rgba(74, 119, 240, 0.9)`
- Primary Transparent (0.1 opacity): `rgba(74, 119, 240, 0.1)`
- Primary Active/Fill: `rgb(81, 173, 246)`

**Brand Secondary**
- Secondary Base: `rgb(253, 197, 48)` (#fdc530)

### Semantic Colors

**Success**
- Success Base: `rgb(0, 209, 162)` (#00d1a2)

**Warning / Secondary**
- Warning Base: `rgb(255, 199, 97)` (#ffc761)

**Error / Danger**
- Danger Base: `rgb(241, 95, 91)` (#f15f5b)

**Info**
- Info Base: `rgb(0, 212, 255)` (#00d4ff)

### Neutral & Background Colors

**Light Mode**
- Body Background: `rgb(243, 247, 250)` (#f3f7fa)
- Header / Card Background: `rgb(255, 255, 255)` (#ffffff)
- Default Text Color: `rgb(60, 72, 88)` (#3c4858)
- Borders (Light): `rgb(239, 240, 246)` (#eff0f6)

**Dark Mode**
- Body Background: `rgb(36, 47, 61)` (#242f3d)
- Sidebar Background: `rgb(27, 36, 48)` (#1b2430)
- Header / Card Background: `rgb(28, 37, 49)` (#1c2531)
- Default Text Color: `rgb(221, 229, 237)` (#dde5ed)
- Borders (Dark): `rgba(255, 255, 255, 0.1)`

## Typography

### Font Families

**Primary Font (Sans-Serif)**
- Font: `"Roboto", sans-serif`
- Usage: Body text, UI elements, headings

### Type Scale
- Base Font Size: `14px`
- Default Font Weight: `400`
- Heading 5 Font Size: `16px`
- Label Font Size: `15px`
- Small UI Text (Selects, Toasts): `12.8px`
- Badge Font Size: `11.2px`
- Badge Font Weight: `500`

## Spacing & Layout System

### Grid & Layout
- Sidebar Width: `250px`
- Theme utilizes Bootstrap default grid and container spacing.
- Standard Padding Component values typically range from `6px 12px` to `16px 24px`.

## Component Design

### Alerts
- Padding: `10px 13.6px`
- Border Radius: `7.2px`
- Background (Light Theme Variants): Solid background or alpha `0.1` opacity of the brand colors.

### Buttons
- Padding (Default): `6px 12px`
- Border Radius: `4.4px`
- Font Size: `14px`
- Box Shadow: `none` (resting state)
- Hover State: Background utilizes main color with `0.9` opacity.
- Variants:
  - Solid: Full brand color background
  - Light: `0.1` opacity brand color background
  - Outline: Transparent background with brand color border

### Badges
- Regular Padding: `4px 7.2px`
- Pill Padding: `3.0px 5.0px`
- Regular Border Radius: `4px`
- Pill Border Radius: `800px`

### Cards
- Border Radius: `7.2px`
- Padding: Header `16px 24px`, Body `19.2px`
- Box Shadow:
  - Light Mode: `rgba(168, 180, 208, 0.17) 0px 4px 25px 0px`
  - Dark Mode: `rgba(255, 255, 255, 0.05) 0px 4px 25px 0px`
- Border Color: `rgb(239, 240, 246)` (Light) / `rgba(255, 255, 255, 0.1)` (Dark)

### Input Fields / Forms
- Padding: `6px 12px`
- Border Radius: `4.4px`
- Background: `rgb(255, 255, 255)` (Light) / `rgb(28, 37, 49)` (Dark)
- Border Color: `rgb(239, 240, 246)` (Light) / `rgba(255, 255, 255, 0.1)` (Dark)
- Label Text Size: `15px`

### Dropdowns / Selects
- Dropdown Menu Background: `rgb(255, 255, 255)` (Light), `rgb(28, 37, 49)` (Dark)
- Dropdown Menu Box-Shadow: `rgba(168, 180, 208, 0.17) 0px 4px 25px` (Light), `rgba(40, 40, 40, 0.15) 0px 16px 18px` (Dark)
- Dropdown Border-Radius: `6px`
- Native Select Background: `rgb(255, 255, 255)` (Light), `rgb(28, 37, 49)` (Dark)
- Select Font Size: `12.8px`

### Checkboxes, Radios & Switches
- Checkbox Radius: `3.5px`
- Checkbox / Radio Background (Unchecked): `rgb(255, 255, 255)` (Light), `rgb(28, 37, 49)` (Dark)
- Checkbox / Radio Border: `1px solid rgb(239, 240, 246)` (Light), `1px solid rgba(255, 255, 255, 0.1)` (Dark)
- Radio Active Border-Radius: `50%`
- Active Background: `rgb(74, 119, 240)`

### Slider / Range Slider
- Track Height: `8px`
- Track Border-Radius: `4px`
- Track Background: `rgb(221, 221, 221)`
- Fill (Active): `rgb(81, 173, 246)`
- Thumb Size: `24px x 24px`
- Thumb Radius: `50%`
- Thumb Color: `rgb(33, 150, 243)`

### Pagination
- Standard States Output Background: `rgb(255, 255, 255)` (Light), `rgb(28, 37, 49)` (Dark)
- Standard States Output Text Color: `rgb(60, 72, 88)` (Light), `rgb(221, 229, 237)` (Dark)
- Active State Background: `rgb(74, 119, 240)`
- Active State Text Color: `rgb(255, 255, 255)`

### Progress Indicators
- Track Height: `16px`
- Radius: `4px`
- Track Background: `rgb(243, 247, 250)` (Light), `rgb(36, 47, 61)` (Dark)
- Bar Fill (Primary): `rgb(74, 119, 240)`

### Spinners / Loading
- Border Width: `3.5px`
- Size: `32px x 32px`
- Spinner Color: `rgb(60, 72, 88)` (Light), `rgb(221, 229, 237)` (Dark)

### Toast Notifications
- Container Background: `rgb(74, 119, 240)`
- Border-Radius: `7.2px`
- Box Shadow: `rgba(10, 10, 10, 0.04) 0px 2px 0px 0px`
- Body Text Size: `12.8px`
- Body Text Color: `rgb(255, 255, 255)`

### Tables
- Header Background: `rgb(243, 247, 250)` (Light), `rgb(36, 47, 61)` (Dark)
- Header Text Size: `14px`
- Body Text Size: `14px`
- Borders: `1px solid rgb(239, 240, 246)` (Light), `1px solid rgba(255, 255, 255, 0.1)` (Dark)
- Border Radius (container): `7.2px`
- Stripe Color (if applied): `rgba(0,0,0,0.02)` (Light), `rgba(255,255,255,0.02)` (Dark)

### Trend Charts
- Primary Chart Stroke: `rgb(74, 119, 240)`
- Secondary Chart Stroke: `rgb(253, 197, 48)`
- Tooltip Background: `rgb(36, 47, 61)` (Dark mode tooltips typically default)
- Tooltip Text Color: `rgb(221, 229, 237)`
- Grid Line Color: `rgb(239, 240, 246)` (Light), `rgba(255, 255, 255, 0.1)` (Dark)

### Modals / Dialogs
- Modal Content Background: `rgb(255, 255, 255)` (Light), `rgb(28, 37, 49)` (Dark)
- Border Radius: `7.2px`
- Header / Footer Borders: `1px solid rgb(239, 240, 246)` (Light), `1px solid rgba(255, 255, 255, 0.1)` (Dark)
- Backdrop: Background `rgb(0, 0, 0)` with opacity overlay.

## Theme Switching Logic
The theme is controlled via classes on the `body` or `html` element and the use of CSS variables (e.g., `--primary-rgb`, `--default-body-bg-color`). Toggling updates these variables and class attributes to transition the UI.
