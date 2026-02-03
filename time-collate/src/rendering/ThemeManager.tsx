import React, { createContext, useContext, type ReactNode } from 'react';

export type ThemeType = 'classic' | 'modern' | 'warm' | 'magazine';

interface ThemeConfig {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    borderColor: string;
}

const THEMES: Record<ThemeType, ThemeConfig> = {
    classic: {
        fontFamily: '"Noto Serif SC", "Playfair Display", serif',
        primaryColor: '#1A1A1A',
        secondaryColor: '#4A4A4A',
        accentColor: '#8C7851', // Gold-ish
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E5E5',
    },
    modern: {
        fontFamily: '"Inter", "system-ui", sans-serif',
        primaryColor: '#000000',
        secondaryColor: '#333333',
        accentColor: '#3B82F6', // Blue
        backgroundColor: '#F9FAFB',
        borderColor: '#F3F4F6',
    },
    warm: {
        fontFamily: '"Ma Shan Zheng", cursive',
        primaryColor: '#5D4037',
        secondaryColor: '#8D6E63',
        accentColor: '#FF7043', // Orange
        backgroundColor: '#FFFBF5',
        borderColor: '#FFE0B2',
    },
    magazine: {
        fontFamily: '"Oswald", "Impact", sans-serif',
        primaryColor: '#D32F2F', // Bold Red
        secondaryColor: '#212121',
        accentColor: '#FBC02D', // Yellow
        backgroundColor: '#FAFAFA',
        borderColor: '#EEEEEE',
    },
};

interface ThemeContextType {
    theme: ThemeType;
    config: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ theme: ThemeType; children: ReactNode }> = ({ theme, children }) => {
    const config = THEMES[theme] || THEMES.classic;

    return (
        <ThemeContext.Provider value={{ theme, config }}>
            <div
                style={{
                    '--theme-font': config.fontFamily,
                    '--theme-primary': config.primaryColor,
                    '--theme-secondary': config.secondaryColor,
                    '--theme-accent': config.accentColor,
                    '--theme-bg': config.backgroundColor,
                    '--theme-border': config.borderColor,
                } as React.CSSProperties}
                className="h-full w-full"
            >
                {children}
            </div>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
