// Design Tokens — Generated from Figma via FMCP
// Collection: Primitives + Semantic

import SwiftUI

// MARK: - Colors
extension Color {
    static let blue50 = Color(red: 0.937, green: 0.965, blue: 1.0)
    static let blue100 = Color(red: 0.859, green: 0.918, blue: 0.996)
    static let blue500 = Color(red: 0.231, green: 0.510, blue: 0.965)
    static let blue600 = Color(red: 0.145, green: 0.388, blue: 0.922)
    static let blue700 = Color(red: 0.114, green: 0.306, blue: 0.847)
    static let gray50 = Color(red: 0.976, green: 0.980, blue: 0.984)
    static let gray100 = Color(red: 0.953, green: 0.957, blue: 0.965)
    static let gray200 = Color(red: 0.898, green: 0.906, blue: 0.922)
    static let gray300 = Color(red: 0.820, green: 0.835, blue: 0.859)
    static let gray500 = Color(red: 0.420, green: 0.447, blue: 0.502)
    static let gray700 = Color(red: 0.216, green: 0.255, blue: 0.318)
    static let gray900 = Color(red: 0.067, green: 0.094, blue: 0.153)
}

// MARK: - Semantic Button Colors
enum ButtonColor {
    enum primary {
        static let bg = Color.blue600
        static let text = Color.white
        static let border = Color.blue600
    }
    enum secondary {
        static let bg = Color.gray100
        static let text = Color.gray900
        static let border = Color.gray200
    }
    enum outline {
        static let bg = Color.white
        static let text = Color.blue600
        static let border = Color.blue600
    }
    enum ghost {
        static let bg = Color.white
        static let text = Color.blue600
    }
    enum disabled {
        static let bg = Color.gray100
        static let text = Color.gray500
        static let border = Color.gray200
    }
}

// MARK: - Semantic Input Colors
enum InputColor {
    static let bg = Color.white
    static let text = Color.gray900
    static let placeholder = Color.gray500
    static let border = Color.gray300
    static let borderFocus = Color.blue500
}

// MARK: - Semantic Surface Colors
enum SurfaceColor {
    static let background = Color.white
    static let foreground = Color.gray900
    static let muted = Color.gray100
    static let border = Color.gray200
}

// MARK: - Spacing
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}

// MARK: - Radius
enum Radius {
    static let sm: CGFloat = 4
    static let md: CGFloat = 8
    static let lg: CGFloat = 12
    static let full: CGFloat = 9999
}

// MARK: - Font Size
enum FontSize {
    static let xs: CGFloat = 12
    static let sm: CGFloat = 14
    static let md: CGFloat = 16
    static let lg: CGFloat = 18
    static let xl: CGFloat = 24
}

// MARK: - Size
enum Size {
    static let touchMinIOS: CGFloat = 44
    static let touchMinAndroid: CGFloat = 48
}

// MARK: - Semantic Button Spacing
enum ButtonSpacing {
    static let paddingX = Spacing.lg
    static let paddingY = Spacing.md
    static let gap = Spacing.sm
    static let radius = Radius.md
    static let fontSize = FontSize.sm
    static let minHeight = Size.touchMinIOS
}

// MARK: - Semantic Input Spacing
enum InputSpacing {
    static let paddingX = Spacing.md
    static let paddingY = Spacing.md
    static let radius = Radius.md
    static let fontSize = FontSize.sm
    static let minHeight = Size.touchMinAndroid
}

// MARK: - Layout Spacing
enum LayoutSpacing {
    static let pagePadding = Spacing.xl
    static let sectionGap = Spacing.lg
    static let elementGap = Spacing.sm
}
