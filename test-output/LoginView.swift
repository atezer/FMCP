/**
 * LoginView — Generated from Figma via FMCP
 * Source: Login / Mobile (node: 5:112)
 * Tokens: DesignTokens.swift
 * A11y: VoiceOver labels, focus order, min touch targets
 */

import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Logo
                VStack(spacing: Spacing.sm) {
                    Circle()
                        .fill(ButtonColor.primary.bg)
                        .frame(width: 64, height: 64)
                        .accessibilityLabel("MyApp logosu")

                    Text("MyApp")
                        .font(.system(size: FontSize.xl, weight: .bold))
                        .foregroundColor(ButtonColor.primary.bg)
                        .accessibilityHidden(true)
                }
                .padding(.top, 80)

                Spacer().frame(height: Spacing.xxl)

                // Headings
                VStack(spacing: Spacing.sm) {
                    Text("Hoş Geldiniz")
                        .font(.system(size: FontSize.xl, weight: .semibold))
                        .foregroundColor(SurfaceColor.foreground)
                        .accessibilityAddTraits(.isHeader)

                    Text("Hesabınıza giriş yapın")
                        .font(.system(size: FontSize.md))
                        .foregroundColor(InputColor.placeholder)
                }

                Spacer().frame(height: Spacing.xl)

                // Form
                VStack(spacing: LayoutSpacing.sectionGap) {
                    // Email
                    TextField("E-posta adresi", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .padding(.horizontal, InputSpacing.paddingX)
                        .padding(.vertical, InputSpacing.paddingY)
                        .frame(minHeight: InputSpacing.minHeight)
                        .background(InputColor.bg)
                        .overlay(
                            RoundedRectangle(cornerRadius: InputSpacing.radius)
                                .stroke(InputColor.border, lineWidth: 1)
                        )
                        .cornerRadius(InputSpacing.radius)
                        .font(.system(size: InputSpacing.fontSize))
                        .accessibilityLabel("E-posta adresi")

                    // Password
                    SecureField("Sifre", text: $password)
                        .textContentType(.password)
                        .padding(.horizontal, InputSpacing.paddingX)
                        .padding(.vertical, InputSpacing.paddingY)
                        .frame(minHeight: InputSpacing.minHeight)
                        .background(InputColor.bg)
                        .overlay(
                            RoundedRectangle(cornerRadius: InputSpacing.radius)
                                .stroke(InputColor.border, lineWidth: 1)
                        )
                        .cornerRadius(InputSpacing.radius)
                        .font(.system(size: InputSpacing.fontSize))
                        .accessibilityLabel("Sifre")

                    // Login Button
                    Button(action: { /* Handle login */ }) {
                        Text("Giriş Yap")
                            .font(.system(size: ButtonSpacing.fontSize, weight: .medium))
                            .foregroundColor(ButtonColor.primary.text)
                            .frame(maxWidth: .infinity, minHeight: ButtonSpacing.minHeight)
                    }
                    .background(ButtonColor.primary.bg)
                    .cornerRadius(ButtonSpacing.radius)
                    .accessibilityLabel("Giriş Yap")

                    // Forgot Password
                    Button("Şifremi unuttum") { /* Navigate */ }
                        .font(.system(size: FontSize.sm, weight: .medium))
                        .foregroundColor(ButtonColor.primary.bg)
                        .frame(maxWidth: .infinity)
                        .accessibilityLabel("Şifremi unuttum")
                }
                .padding(.horizontal, 0)

                Spacer().frame(height: Spacing.xl)

                // Divider
                HStack(spacing: LayoutSpacing.sectionGap) {
                    Rectangle()
                        .fill(SurfaceColor.border)
                        .frame(height: 1)
                    Text("veya")
                        .font(.system(size: FontSize.sm))
                        .foregroundColor(InputColor.placeholder)
                    Rectangle()
                        .fill(SurfaceColor.border)
                        .frame(height: 1)
                }
                .accessibilityHidden(true)

                Spacer().frame(height: Spacing.xl)

                // Google Login
                Button(action: { /* Google login */ }) {
                    Text("Google ile Giriş Yap")
                        .font(.system(size: ButtonSpacing.fontSize, weight: .medium))
                        .foregroundColor(ButtonColor.secondary.text)
                        .frame(maxWidth: .infinity, minHeight: ButtonSpacing.minHeight)
                }
                .background(ButtonColor.secondary.bg)
                .overlay(
                    RoundedRectangle(cornerRadius: ButtonSpacing.radius)
                        .stroke(ButtonColor.secondary.border, lineWidth: 1)
                )
                .cornerRadius(ButtonSpacing.radius)
                .accessibilityLabel("Google ile Giriş Yap")

                Spacer().frame(height: Spacing.lg)

                // Register
                HStack(spacing: Spacing.xs) {
                    Text("Hesabiniz yok mu?")
                        .font(.system(size: FontSize.sm))
                        .foregroundColor(InputColor.placeholder)
                    Button("Kayıt Ol") { /* Navigate */ }
                        .font(.system(size: FontSize.sm, weight: .semibold))
                        .foregroundColor(ButtonColor.primary.bg)
                }
            }
            .padding(.horizontal, LayoutSpacing.pagePadding)
            .padding(.bottom, 40)
        }
        .background(SurfaceColor.background)
    }
}

#Preview {
    LoginView()
}
