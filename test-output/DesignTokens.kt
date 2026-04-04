// Design Tokens — Generated from Figma via FMCP
// Collection: Primitives + Semantic

package com.myapp.design

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Primitive Colors
object AppColors {
    val blue50 = Color(0xFFEFF6FF)
    val blue100 = Color(0xFFDBEAFE)
    val blue500 = Color(0xFF3B82F6)
    val blue600 = Color(0xFF2563EB)
    val blue700 = Color(0xFF1D4ED8)
    val gray50 = Color(0xFFF9FAFB)
    val gray100 = Color(0xFFF3F4F6)
    val gray200 = Color(0xFFE5E7EB)
    val gray300 = Color(0xFFD1D5DB)
    val gray500 = Color(0xFF6B7280)
    val gray700 = Color(0xFF374151)
    val gray900 = Color(0xFF111827)
    val white = Color(0xFFFFFFFF)
    val black = Color(0xFF000000)
}

// Semantic Button Colors
object ButtonColors {
    object Primary {
        val bg = AppColors.blue600
        val text = AppColors.white
        val border = AppColors.blue600
    }
    object Secondary {
        val bg = AppColors.gray100
        val text = AppColors.gray900
        val border = AppColors.gray200
    }
    object Outline {
        val bg = AppColors.white
        val text = AppColors.blue600
        val border = AppColors.blue600
    }
    object Ghost {
        val bg = AppColors.white
        val text = AppColors.blue600
    }
    object Disabled {
        val bg = AppColors.gray100
        val text = AppColors.gray500
        val border = AppColors.gray200
    }
}

// Semantic Input Colors
object InputColors {
    val bg = AppColors.white
    val text = AppColors.gray900
    val placeholder = AppColors.gray500
    val border = AppColors.gray300
    val borderFocus = AppColors.blue500
}

// Semantic Surface Colors
object SurfaceColors {
    val background = AppColors.white
    val foreground = AppColors.gray900
    val muted = AppColors.gray100
    val border = AppColors.gray200
}

// Spacing
object Spacing {
    val xxs = 2.dp
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val xxl = 32.dp
}

// Radius
object AppRadius {
    val sm = 4.dp
    val md = 8.dp
    val lg = 12.dp
    val full = 9999.dp
}

// Font Size
object AppFontSize {
    val xs = 12.sp
    val sm = 14.sp
    val md = 16.sp
    val lg = 18.sp
    val xl = 24.sp
}

// Size
object AppSize {
    val touchMinIos = 44.dp
    val touchMinAndroid = 48.dp
}

// Semantic Button Spacing
object ButtonSpacing {
    val paddingX = Spacing.lg
    val paddingY = Spacing.md
    val gap = Spacing.sm
    val radius = AppRadius.md
    val fontSize = AppFontSize.sm
    val minHeight = AppSize.touchMinIos
}

// Semantic Input Spacing
object InputSpacing {
    val paddingX = Spacing.md
    val paddingY = Spacing.md
    val radius = AppRadius.md
    val fontSize = AppFontSize.sm
    val minHeight = AppSize.touchMinAndroid
}

// Layout Spacing
object LayoutSpacing {
    val pagePadding = Spacing.xl
    val sectionGap = Spacing.lg
    val elementGap = Spacing.sm
}
