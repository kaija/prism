# Vuexy Frontend Design System Guide

## Introduction

This design guide establishes the visual and interaction standards for applications based on the "Vuexy" admin dashboard theme (Dark Theme focus with Light Theme equivalents). It follows the structural requirements of the standard design template to ensure consistency.

## Color Palette

### Primary Colors

**Brand Primary (Vuexy Purple)**
- Primary Base: `rgb(115, 103, 240)` (#7367F0)
- Primary Transparent: `rgba(115, 103, 240, 0.16)` (Used for "Label Buttons" and active states)

**Brand Secondary**
- Secondary Base: `rgb(128, 131, 144)` (#808390)

### Semantic Colors

**Success**
- Success Base: `rgb(40, 199, 111)` (#28C76F)

**Warning**
- Warning Base: `rgb(255, 159, 67)` (#FF9F43)

**Danger**
- Danger Base: `rgb(255, 76, 81)` (#FF4C51)

**Info**
- Info Base: `rgb(0, 186, 209)` (#00BAD1)

### Neutral & Background Colors

**Light Mode**
- Body Background: `rgb(248, 247, 250)` (#F8F7FA)
- Card / Sidebar Background: `rgb(255, 255, 255)` (#FFFFFF)
- Input Border: `rgb(219, 218, 222)` (#DBDADE)
- Card Shadow: `rgba(47, 43, 61, 0.14) 0px 3px 12px`

**Dark Mode**
- Body Background: `rgb(37, 41, 60)` (#25293C)
- Card / Sidebar Background: `rgb(47, 51, 73)` (#2F3349)
- Active Menu Background: `rgb(61, 65, 87)` (#3D4157)
- Input Border: `rgb(83, 88, 118)` (#535876)
- Card Shadow: `rgba(19, 17, 32, 0.2) 0px 3px 12px`

## Typography

### Font Families

**Primary Font (Sans-Serif)**
- Font: `"Public Sans", sans-serif`
- Usage: Body text, UI elements, headings. Clean, geometric, and modern.

### Type Scale
- Base Font Size: `15px`
- Card Title Font Size: `18px`
- Table Header Text (Uppercase): `13px`

## Spacing & Layout System

### Grid & Layout
- Sidebar Width: `260px`
- Topbar Height: `64px` 

### Sidebar Menu Structure
- Menu Items: Padding `8px 12px 12px 15px`.
- Sub-menu Items: Indented with padding-left `42px`.
- Active State: Background tinted (#3D4157 in dark mode), primary text color, and subtle right indicator/shadow.
- Hover Effect: Light transition to lighter background hue.
- Icons: 18-20px monochromatic icons (Tabler style).

## Component Design

### Buttons
- Border Radius: `6px`
- Pillar Radius: `800px`
- Solid Primary: Background `#7367F0`, white text, shadow `rgba(115, 103, 240, 0.3) 0px 2px 6px`.
- Label Primary (Translucent): Background `rgba(115, 103, 240, 0.16)`, Text `#7367F0`.
- Outline: Transparent background, 1px solid border.

### Badges
- Border Radius: `6px`
- Pill Radius: `800px`
- Colors match buttons (Solid or Light translucent variations).

### Input Fields & Forms
- Border Radius: `6px`
- Background: Transparent (`rgba(0,0,0,0)`)
- Border Color: `#535876` (Dark) / `#DBDADE` (Light)
- Focus State: Border becomes Primary (`#7367F0`) with a subtle glow.
- Floating Labels: Standard input height 58px allowing label to float cleanly.

### Tables
- Header Background: Lightly tinted or transparent.
- Header Text: 13px, uppercase, bold.
- Row Padding: `12.5px` vertical, `20px` horizontal.
- Row Hover: Subtle contrast (#353A52 Dark / #F1F0F2 Light).
- Borders: Horizontal lines (`#44485E` Dark / `#EBE9F1` Light).

### Trend Charts (ApexCharts)
- Primary Series Stroke: `#7367F0`
- Secondary Series Stroke: `#28C76F` or `#00BAD1`
- Grid Lines: Faint `rgba(255, 255, 255, 0.05)` (Dark mode).

### Modals & Overlays
- Modal Radius: `8px`
- Backdrop: Dark translucent overlay.
- Toasts: Glassmorphism effect in Dark mode (rgba(47, 51, 73, 0.85) with backdrop-filter blur).

### Spinners
- Diameter: `32px`
- Border-top: `#7367F0` (Primary).

## Theme Switching Logic
Switches primarily handled by cascading data-theme or class toggles adjusting CSS Custom Properties (`--bg-body`, `--bg-card`, `--border-color`).
