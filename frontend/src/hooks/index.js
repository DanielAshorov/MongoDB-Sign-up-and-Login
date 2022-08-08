import { useContext } from "react";
import { AuthContext } from "../context/AuthProvider";
import { NotificationContext } from "../context/NotificationProvider";
import { themeContext } from "../context/ThemeProvider";


export const useTheme = () => useContext(themeContext)
export const useNotification = () => useContext(NotificationContext)
export const useAuth = () => useContext(AuthContext)
