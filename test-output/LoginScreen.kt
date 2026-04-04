/**
 * LoginScreen — Generated from Figma via FMCP
 * Source: Login / Mobile (node: 5:112)
 * Tokens: DesignTokens.kt
 * A11y: TalkBack contentDescription, min touch targets 48dp
 */

package com.myapp.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.myapp.design.*

@Composable
fun LoginScreen(
    onLogin: (String, String) -> Unit = { _, _ -> },
    onForgotPassword: () -> Unit = {},
    onGoogleLogin: () -> Unit = {},
    onRegister: () -> Unit = {}
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SurfaceColors.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = LayoutSpacing.pagePadding)
            .padding(top = 80.dp, bottom = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Logo
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(ButtonColors.Primary.bg)
                .semantics { contentDescription = "MyApp logosu" }
        )

        Spacer(modifier = Modifier.height(Spacing.sm))

        Text(
            text = "MyApp",
            fontSize = AppFontSize.xl,
            fontWeight = FontWeight.Bold,
            color = ButtonColors.Primary.bg
        )

        Spacer(modifier = Modifier.height(Spacing.xxl))

        // Headings
        Text(
            text = "Hoş Geldiniz",
            fontSize = AppFontSize.xl,
            fontWeight = FontWeight.SemiBold,
            color = SurfaceColors.foreground,
            modifier = Modifier.semantics { heading() }
        )

        Spacer(modifier = Modifier.height(Spacing.sm))

        Text(
            text = "Hesabınıza giriş yapın",
            fontSize = AppFontSize.md,
            color = InputColors.placeholder
        )

        Spacer(modifier = Modifier.height(Spacing.xl))

        // Email Input
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            placeholder = { Text("E-posta adresi", color = InputColors.placeholder) },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = InputSpacing.minHeight),
            shape = RoundedCornerShape(InputSpacing.radius),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = InputColors.bg,
                focusedContainerColor = InputColors.bg,
                unfocusedBorderColor = InputColors.border,
                focusedBorderColor = InputColors.borderFocus,
                unfocusedTextColor = InputColors.text,
                focusedTextColor = InputColors.text,
            )
        )

        Spacer(modifier = Modifier.height(LayoutSpacing.sectionGap))

        // Password Input
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            placeholder = { Text("Sifre", color = InputColors.placeholder) },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = InputSpacing.minHeight),
            shape = RoundedCornerShape(InputSpacing.radius),
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = InputColors.bg,
                focusedContainerColor = InputColors.bg,
                unfocusedBorderColor = InputColors.border,
                focusedBorderColor = InputColors.borderFocus,
                unfocusedTextColor = InputColors.text,
                focusedTextColor = InputColors.text,
            )
        )

        Spacer(modifier = Modifier.height(LayoutSpacing.sectionGap))

        // Login Button
        Button(
            onClick = { onLogin(email, password) },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = ButtonSpacing.minHeight),
            shape = RoundedCornerShape(ButtonSpacing.radius),
            colors = ButtonDefaults.buttonColors(
                containerColor = ButtonColors.Primary.bg,
                contentColor = ButtonColors.Primary.text
            )
        ) {
            Text(
                text = "Giriş Yap",
                fontSize = ButtonSpacing.fontSize,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(LayoutSpacing.sectionGap))

        // Forgot Password
        TextButton(onClick = onForgotPassword) {
            Text(
                text = "Şifremi unuttum",
                fontSize = AppFontSize.sm,
                fontWeight = FontWeight.Medium,
                color = ButtonColors.Primary.bg
            )
        }

        Spacer(modifier = Modifier.height(Spacing.xl))

        // Divider
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(LayoutSpacing.sectionGap)
        ) {
            HorizontalDivider(
                modifier = Modifier.weight(1f),
                color = SurfaceColors.border
            )
            Text(
                text = "veya",
                fontSize = AppFontSize.sm,
                color = InputColors.placeholder
            )
            HorizontalDivider(
                modifier = Modifier.weight(1f),
                color = SurfaceColors.border
            )
        }

        Spacer(modifier = Modifier.height(Spacing.xl))

        // Google Login
        OutlinedButton(
            onClick = onGoogleLogin,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = ButtonSpacing.minHeight),
            shape = RoundedCornerShape(ButtonSpacing.radius),
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = ButtonColors.Secondary.bg,
                contentColor = ButtonColors.Secondary.text
            ),
            border = BorderStroke(1.dp, ButtonColors.Secondary.border)
        ) {
            Text(
                text = "Google ile Giriş Yap",
                fontSize = ButtonSpacing.fontSize,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(Spacing.lg))

        // Register
        Row(
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Hesabiniz yok mu?",
                fontSize = AppFontSize.sm,
                color = InputColors.placeholder
            )
            TextButton(onClick = onRegister) {
                Text(
                    text = "Kayıt Ol",
                    fontSize = AppFontSize.sm,
                    fontWeight = FontWeight.SemiBold,
                    color = ButtonColors.Primary.bg
                )
            }
        }
    }
}
