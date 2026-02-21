# Velvet Frontend Design System Guide

## Introduction

This design guide establishes visual and interaction standards for the applications based on the Velvet theme extracted from the NextJS Spruko dashboard. It follows the structural requirements of the standard design template to ensure consistency across both light and dark modes.

## Color Palette

### Primary Colors

**Brand Primary (Velvet Purple)**
- Primary Base: `rgb(142, 84, 233)` (#8E54E9)
- Primary Transparent: `rgba(142, 84, 233, 0.1)`

**Brand Secondary (Coral/Orange)**
- Secondary Base: `rgb(245, 111, 75)` (#F56F4B)

### Semantic Colors

**Success**
- Success Base: `rgb(38, 191, 148)` (#26BF94)
- Success Transparent: `rgba(38, 191, 148, 0.1)`

*(Note: Standard bootstrap-like semantics for info, warning, danger also apply using similar alpha-0.1 background patterns).*

### Neutral & Background Colors

**Global (Both Modes)**
- Sidebar Background: `rgb(38, 44, 60)` (#262c3c)
- Topbar Background/Header: Transparent overlay or `rgb(142, 84, 233)` dependent on page layout.

**Light Mode**
- Body Background: `rgb(237, 238, 241)` (#edeeef)
- Card / Input Background: `rgb(255, 255, 255)` (#ffffff)
- Default Text Color: `rgb(27, 44, 63)` (#1b2c3f)
- Headings: `rgb(27, 44, 63)`
- Card Shadows: `rgba(0, 0, 0, 0.04) 0px 2.4px 1.6px 0px`
- Borders: `1px solid rgba(27, 44, 63, 0.1)` (or equivalent light border)

**Dark Mode**
- Body Background: `rgba(38, 44, 60, 0.95)`
- Card / Input Background: `rgb(38, 44, 60)` (#262c3c)
- Default Text Color: `rgba(255, 255, 255, 0.7)`
- Headings: `rgba(255, 255, 255, 0.7)`
- Card Shadows: `rgba(255, 255, 255, 0.04) 0px 2.4px 28.8px 0px`
- Borders: `1px solid rgba(255, 255, 255, 0.1)`

## Typography

### Font Families

**Primary Font (Sans-Serif)**
- Font: `"Inter", sans-serif`
- Usage: Body text, UI elements, headings. Inter provides a clean, modern aesthetic suitable for dashboards.

### Type Scale
- Base Font Size: `13.6px` (Default UI elements)
- Default Font Weight: `400`
- Heading Font Size: `20px` (Weight 600)
- Label Font Size: `12.8px` (Weight 500)
- Badge Font Size: `9.75px` to `10.2px` (Weight 600)

## Spacing & Layout System

### Grid & Layout
- Sidebar Width: `240px`
- Topbar Height: `64px`
- Layout: Typical dashboard grid layout with container padding. Spaces are normally multiples of 4px.

## Component Design

### Alerts
- Padding: `10px 13.6px`
- Border Radius: `6.4px`
- Style: Foundation uses a light transparent background of the semantic color with solid text and `1px solid [color-alpha-0.1]` border.

### Buttons
- Padding (Standard): `8px 13.6px`
- Padding (Small): `4px 8px`
- Border Radius (Standard): `5.6px`
- Border Radius (Pill/Rounded): `50%` or `50px`
- Font Size: `13.6px`
- Primary Style: Background `#8E54E9`, Text `#FFFFFF`
- Light Variant: Background `rgba(142, 84, 233, 0.1)`, Text `#8E54E9`

### Badges
- Regular Padding: `4px 7.2px`
- Regular Border Radius: `6.4px`
- Pill Border Radius: `800px`

### Cards
- Border Radius: `6.4px` (implied by modals/alerts consistency)
- Background: `rgb(255, 255, 255)` (Light), `rgb(38, 44, 60)` (Dark)
- Border: `none` (Light), `1px solid rgba(255, 255, 255, 0.1)` (Dark)
- Shadow: Soft, elevated shadow varying by theme mode.

### Input Fields & Selects
- Height: `42px` (Inputs), `33.5px` (Selects)
- Padding: `8px 16px` (Inputs), `6px 36px 6px 12px` (Selects)
- Border Radius: `50px` (Rounded inputs), `6px` (Standard selects)
- Background: `rgba(255, 255, 255, 0.1)` (Dark mode fallback)
- Labels: `12.8px`, 500 weight, margin-bottom `8px`, opacity applied in dark mode.

### Pagination
- Padding: `6px 12px`
- Border Radius (Outer corners): `6px`
- Link Background (Dark Mode): `rgb(38, 44, 60)`
- Active State: Background `#8E54E9`, Text `#FFFFFF`

### Progress Bars
- Height: `12px`
- Container Background: `rgb(47, 52, 66)` (Dark mode context)
- Border Radius: `4px`
- Transition: `0.6s ease`

### Tables
- Header Background: `rgba(27, 44, 63, 0.05)` (Light), `rgba(0, 0, 0, 0.1)` (Dark)
- Header Text: `13.6px`, weight 600
- Body Text: `13.6px`
- Borders: `1px solid rgba(27, 44, 63, 0.1)` (Light), `1px solid rgba(255, 255, 255, 0.1)` (Dark)
- Border Radius (table container): `6.4px`
- Row Hover: `rgba(142, 84, 233, 0.05)` (Primary transparent)

### Trend Charts
- Primary Chart Stroke: `rgb(142, 84, 233)`
- Secondary Chart Stroke: `rgb(245, 111, 75)`
- Tooltip Background: `rgb(38, 44, 60)`
- Tooltip Text Color: `rgba(255, 255, 255, 0.7)`
- Grid Line Color: `rgba(27, 44, 63, 0.1)` (Light), `rgba(255, 255, 255, 0.1)` (Dark)

### Modals
- Border Radius: `6.4px`
- Body Padding: `15px`
- Header/Footer Padding: `16px 20px`
- Content Background: `rgb(38, 44, 60)` (Dark mode)
- Backdrop: `#000` at `0.5` opacity.

## Theme Switching Logic
The theme relies on CSS custom variables on the `:root` and `[data-theme="dark"]` selectors, altering background RGB components, text colors, and alphas for borders and shadows seamlessly across the application.
