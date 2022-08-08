import React, { createContext, useEffect } from 'react'

export const themeContext = createContext();

const defaultTheme = "light";
const darkTheme = "dark";

export default function ThemeProvider({ children }) {
    const toggleTheme = () => {
        const oldTheme = getTheme();
        const newTheme = oldTheme === defaultTheme ? darkTheme : defaultTheme;

        updateTheme(newTheme, oldTheme);
    };
    useEffect(() => {
        const theme = getTheme();
        if (!theme) updateTheme(defaultTheme);
        else updateTheme(theme);

    }, []);
    return (
        <themeContext.Provider value={{ toggleTheme }}>
            {children}
        </themeContext.Provider>
    )
}

const getTheme = () => localStorage.getItem("theme");

const updateTheme = (theme, themeToRemove) => {
    if(themeToRemove)
        document.documentElement.classList.remove(themeToRemove);
    document.documentElement.classList.add(theme);

    localStorage.setItem("theme", theme);

};
