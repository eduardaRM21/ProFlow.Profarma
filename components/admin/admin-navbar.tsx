"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  KeyRound,
  LogOut,
  Shield,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface AdminNavbarProps {
  sessionData: any;
  onLogout: () => void;
  onPasswordChange: () => void;
}

export default function AdminNavbar({
  sessionData,
  onLogout,
  onPasswordChange
}: AdminNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme, setTheme } = useTheme();

  const getUserDisplayName = () => {
    if (sessionData?.colaboradores && sessionData.colaboradores.length > 0) {
      return sessionData.colaboradores.join(", ");
    }
    return "Usuário Admin";
  };

  const getUserRole = () => {
    if (sessionData?.area === "admin-embalagem") {
      return "Admin Embalagem";
    }
    return "Admin CRDK";
  };

  const getRoleColor = () => {
    if (sessionData?.area === "admin-embalagem") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Modo Claro';
      case 'dark':
        return 'Modo Escuro';
      default:
        return 'Sistema';
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e Título */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Painel Administrativo
                </h1>
                <p className="hidden md:block text-sm text-gray-500 dark:text-gray-400">
                  Sistema de Bipagem Embalagem
                </p>
              </div>
            </div>
          </div>

          {/* Informações do Usuário e Menu */}
          <div className="flex items-center space-x-4">
            {/* Informações do Usuário */}
            <div className="hidden md:flex items-center space-x-3 text-sm">
              <div className="text-right">
              </div>
            </div>

             {/* Menu Dropdown do Usuário */}
             <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
               <DropdownMenuTrigger asChild>
                 <Button
                   variant="outline"
                   className="flex items-center space-x-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
                 >
                   <div className="flex items-center space-x-2">
                     <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                       <User className="h-4 w-4 text-white" />
                     </div>
                     <div className="hidden sm:block text-left">
                       <div className="text-sm font-medium text-gray-900 dark:text-white">
                         {getUserDisplayName()}
                       </div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                         {getUserRole()}
                       </div>
                     </div>
                   </div>
                   <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                 </Button>
               </DropdownMenuTrigger>

               <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                 <DropdownMenuLabel className="font-normal">
                   <div className="flex flex-col space-y-1">
                     <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                       {getUserDisplayName()}
                     </p>
                     <p className="text-xs leading-none text-muted-foreground">
                       {getUserRole()}
                     </p>
                     <p className="text-xs leading-none text-muted-foreground">
                       {sessionData?.data || new Date().toISOString().split('T')[0]} •
                       {sessionData?.turno || 'Manhã'}
                     </p>
                   </div>
                 </DropdownMenuLabel>

                 <DropdownMenuSeparator />

                 <DropdownMenuItem
                   onClick={onPasswordChange}
                   className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                 >
                   <KeyRound className="h-4 w-4" />
                   <span>Alterar Senha</span>
                 </DropdownMenuItem>

                 <DropdownMenuSeparator />

                 {/* Opções de Tema */}
                 <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                   Aparência
                 </DropdownMenuLabel>

                 <DropdownMenuItem
                   onClick={() => setTheme('light')}
                   className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                 >
                   <Sun className="h-4 w-4" />
                   <span>Modo Claro</span>
                   {theme === 'light' && <span className="ml-auto text-blue-600">✓</span>}
                 </DropdownMenuItem>

                 <DropdownMenuItem
                   onClick={() => setTheme('dark')}
                   className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                 >
                   <Moon className="h-4 w-4" />
                   <span>Modo Escuro</span>
                   {theme === 'dark' && <span className="ml-auto text-blue-600">✓</span>}
                 </DropdownMenuItem>

                 <DropdownMenuItem
                   onClick={() => setTheme('system' as any)}
                   className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                 >
                   <Monitor className="h-4 w-4" />
                   <span>Sistema</span>
                   {(theme as any) === 'system' && <span className="ml-auto text-blue-600">✓</span>}
                 </DropdownMenuItem>

                 <DropdownMenuSeparator />

                 <DropdownMenuItem
                   onClick={onLogout}
                   className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                 >
                   <LogOut className="h-4 w-4" />
                   <span>Sair</span>
                 </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
