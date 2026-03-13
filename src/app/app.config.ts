import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection,importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt-interceptor';
import { LucideAngularModule, Package, Users,LayoutDashboard,ShieldCheck,Book, Menu} from 'lucide-angular';
import { tokenExpirationInterceptor } from './interceptors/tokenexpiration';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideHttpClient(
      withInterceptors([tokenExpirationInterceptor])
    ),
    importProvidersFrom(
      LucideAngularModule.pick({ Package, Users,LayoutDashboard,ShieldCheck,Book,Menu}) // Choisis les icônes globales
    )
  ]
};