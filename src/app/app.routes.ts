import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PeliculaDetallesComponent } from './components/pelicula-detalles/pelicula-detalles.component';
import { CreditoDetallesComponent } from './components/credito-detalles/credito-detalles.component';
import { BusquedaPeliculasComponent } from './components/busqueda-peliculas/busqueda-peliculas.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthGuard, NoAuthGuard } from './shared/guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { PerfilComponent } from './components/perfil/perfil.component';

export const routes: Routes = [

    {
        path: '',
        component: HomeComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'pelicula/:id',
        component: PeliculaDetallesComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'persona/:id',
        component: CreditoDetallesComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'buscador-peliculas',
        component: BusquedaPeliculasComponent,
        canActivate: [AuthGuard]

    },
    {
        path: "registro",
        component: RegisterComponent,
        canActivate: [NoAuthGuard]
    },
    {
        path: "login",
        component: LoginComponent,
        canActivate: [NoAuthGuard]
    },
    {
        path: "perfil",
        component: PerfilComponent,
        canActivate: [AuthGuard]
    },
    { path: '**', redirectTo: 'login' }

];
