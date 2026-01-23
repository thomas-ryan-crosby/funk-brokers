# Funk Brokers Style Guide

## Color Palette

### Primary Colors

**Blue Primary**
- Main Blue: `#1e3a8a` (Dark Navy)
- Medium Blue: `#3b82f6` (Bright Blue)
- Light Blue: `#60a5fa` (Sky Blue)
- Blue Gradient: `linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)`

**Yellow Accent**
- Primary Yellow: `#fbbf24` (Golden Yellow)
- Dark Yellow: `#f59e0b` (Amber)
- Yellow Gradient: `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`

### Neutral Colors

**Text Colors**
- Primary Text: `#1e293b` (Slate 800)
- Secondary Text: `#64748b` (Slate 500)
- Light Text: `#ffffff` (White)

**Background Colors**
- Primary Background: `#ffffff` (White)
- Secondary Background: `#f8fafc` (Slate 50)
- Dark Background: `#1e293b` (Slate 800)

**Border Colors**
- Light Border: `#e2e8f0` (Slate 200)
- Medium Border: `#cbd5e1` (Slate 300)

## Typography

### Font Families
- Primary: System font stack (inherit from body)
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif`

### Font Sizes
- Hero Title: `clamp(36px, 5vw, 64px)` - Weight: 800
- Section Title: `clamp(32px, 4vw, 48px)` - Weight: 700
- Card Title: `24px` - Weight: 600
- Body Large: `20px` - Weight: 400
- Body: `16px` - Weight: 400
- Small: `14px` - Weight: 400

### Line Heights
- Headings: `1.1` to `1.2`
- Body: `1.6` to `1.7`

### Letter Spacing
- Headings: `-0.02em` (tight)
- Uppercase: `0.05em` to `0.1em`

## Spacing System

### Padding & Margins
- XS: `8px`
- SM: `12px`
- MD: `16px`
- LG: `24px`
- XL: `32px`
- 2XL: `40px`
- 3XL: `60px`
- 4XL: `80px`
- 5XL: `100px`

### Section Padding
- Standard: `100px 0`
- Compact: `60px 0`
- Hero: `120px 20px 100px`

## Border Radius

- Small: `8px` (buttons, small cards)
- Medium: `12px` (icons, feature cards)
- Large: `16px` (large cards, containers)

## Shadows

- Small: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Medium: `0 4px 14px rgba(0, 0, 0, 0.15)`
- Large: `0 12px 24px rgba(0, 0, 0, 0.1)`
- Hover: `0 6px 20px rgba(0, 0, 0, 0.2)`

## Buttons

### Primary Button
- Background: White (`#ffffff`)
- Text: Blue Primary (`#1e3a8a`)
- Border: None
- Shadow: Medium
- Hover: Light gray background, lift effect

### Secondary Button
- Background: Transparent with backdrop blur
- Text: White
- Border: `rgba(255, 255, 255, 0.3)`
- Hover: Increased opacity

### Outline Button
- Background: Transparent
- Text: White or Blue Primary
- Border: White or Blue Primary
- Hover: Fill with background color

### Button Sizes
- Standard: `14px 32px`
- Large: `16px 40px`

## Cards

### Feature Cards
- Background: White
- Border: `1px solid #e2e8f0`
- Border Radius: `16px`
- Padding: `40px`
- Shadow: Small
- Hover: Lift effect, blue border, larger shadow

### Icon Containers
- Background: Blue gradient
- Size: `56px × 56px`
- Border Radius: `12px`
- Icon Color: White

## Gradients

### Primary Gradient (Blue)
```css
background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
```

### Accent Gradient (Yellow)
```css
background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
```

### Text Gradient (Yellow on Blue)
```css
background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

## Transitions

- Standard: `all 0.2s ease`
- Smooth: `all 0.3s ease`
- Hover Effects: `transform 0.2s ease`, `box-shadow 0.2s ease`

## Responsive Breakpoints

- Mobile: `480px`
- Tablet: `768px`
- Desktop: `1024px`
- Large Desktop: `1200px`

## Component Patterns

### Section Header
- Centered text
- Title: Section title style
- Subtitle: 20px, secondary text color
- Max width: 600px, centered

### Container
- Max width: `1200px`
- Padding: `0 24px`
- Margin: `0 auto`

### Grid Layouts
- Features: `repeat(auto-fit, minmax(320px, 1fr))`
- Gap: `32px`

## Usage Examples

### Primary CTA
```css
.btn-primary {
  background: white;
  color: #1e3a8a;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}
```

### Feature Icon
```css
.feature-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: 12px;
}
```

### Highlighted Text
```css
.title-highlight {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```
