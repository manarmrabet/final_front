import { ApplicationConfig, provideBrowserGlobalErrorListeners,LOCALE_ID, provideZonelessChangeDetection,importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt-interceptor';
// Locale française — corrige NG0701 "Missing locale data for fr"
// DatePipe avec | date:'HH:mm:ss' nécessite que la locale soit enregistrée
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
registerLocaleData(localeFr);
import { LucideAngularModule,Book,
  Home,
  LayoutDashboard,
  Grid,
  List,
  ClipboardList,
  Shield,
  ShieldCheck,
  Users,
  User,
  UserPlus,
  UserMinus,
  UserCheck,
  Settings,
  Sliders,
  BarChart,
  PieChart,
  LineChart,
  Activity,
  Mail,
  Inbox,
  Send,
  FileText,
  Folder,
  FolderPlus,
  Calendar,
  Clock,
  Bell,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Percent,
  Truck,
  Package,
  Box,
  Columns,
  Table,
  FilePlus,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Lock,
  Unlock,
  LogOut,
  LogIn,
  Menu,             // pour fallback
  Circle} from 'lucide-angular';
import { tokenExpirationInterceptor } from './interceptors/tokenexpiration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideHttpClient(
      withInterceptors([tokenExpirationInterceptor])
    ),

    { provide: LOCALE_ID, useValue: 'fr' },

    importProvidersFrom(
      LucideAngularModule.pick({ Package, Users,LayoutDashboard,ShieldCheck,Book,Menu,
  Home,
  Grid,
  List,
  ClipboardList,
  Shield,
  User,
  UserPlus,
  UserMinus,
  UserCheck,
  Settings,
  Sliders,
  BarChart,
  PieChart,
  LineChart,
  Activity,
  Mail,
  Inbox,
  Send,
  FileText,
  Folder,
  FolderPlus,
  Calendar,
  Clock,
  Bell,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Percent,
  Truck,
  Box,
  Columns,
  Table,
  FilePlus,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Lock,
  Unlock,
  LogOut,
  LogIn,             // pour fallback
  Circle}) 
    )
  ]
};