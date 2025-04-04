// src/app/components/usuarios-lista/usuarios-lista.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserSocialService } from '../../services/social.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { User, UserResponse } from '../../models/user.model';

@Component({
  selector: 'app-usuarios-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lista-usuarios.component.html',
  styleUrls: ['./lista-usuarios.component.css']
})
export class UsuariosListaComponent implements OnInit {
  usuarios: User[] = [];
  cargando = false;
  error = false;
  paginaActual = 1;
  totalPaginas = 0;
  totalUsuarios = 0;
  hayMasPaginas = true;
  searchForm: FormGroup;
  mostrarBotonSubir = false;

  constructor(
    private userSocialService: UserSocialService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      username: [
        '',
        [
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-Z0-9_-]*$/) // Solo letras, números, guiones y guiones bajos
        ]
      ]
    });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();

    // Configurar búsqueda con debounce
    this.searchForm.get('username')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value && value.length > 2) {
          this.buscarUsuarios(value);
        } else if (!value) {
          this.resetearBusqueda();
        }
      });
  }

  resetearBusqueda(): void {
    this.paginaActual = 1;
    this.usuarios = [];
    this.cargarUsuarios();
  }

  cargarUsuarios(pagina: number = 1): void {
    if (this.cargando) return;

    this.cargando = true;
    this.error = false;

    this.userSocialService.getAllUsers(pagina).subscribe({
      next: (response: UserResponse) => {
        if (pagina === 1) {
          this.usuarios = response.users;
        } else {
          this.usuarios = [...this.usuarios, ...response.users];
        }

        this.totalPaginas = response.pagination.totalPages;
        this.totalUsuarios = response.pagination.total;
        this.hayMasPaginas = response.pagination.hasMore;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar usuarios:', error);
        this.cargando = false;
        this.error = true;
      }
    });
  }

  buscarUsuarios(termino: string): void {
    this.cargando = true;
    this.error = false;

    this.userSocialService.searchUsers(termino).subscribe({
      next: (usuarios: User[]) => {
        this.usuarios = usuarios;
        this.hayMasPaginas = false; // Desactivar scroll infinito en modo búsqueda
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al buscar usuarios:', error);
        this.cargando = false;
        this.error = true;
      }
    });
  }

  toggleFollow(usuario: User, event: Event): void {
    event.stopPropagation();

    // Mostrar estado visual inmediatamente para mejor experiencia
    const previousState = usuario.isFollowing;
    usuario.isFollowing = !previousState;

    // Llamar al endpoint correspondiente
    const action = previousState
      ? this.userSocialService.unfollowUser(usuario._id)
      : this.userSocialService.followUser(usuario._id);

    action.subscribe({
      next: () => {
        console.log(`${previousState ? 'Dejaste de seguir' : 'Ahora sigues'} a ${usuario.username}`);
      },
      error: (error) => {
        console.error('Error al cambiar estado de seguimiento:', error);
        // Revertir estado visual en caso de error
        usuario.isFollowing = previousState;

        // Mostrar mensaje de error (puedes implementar un servicio de notificaciones)
        alert(`Error: ${error.error?.message || 'No se pudo completar la acción'}`);
      }
    });
  }

  @HostListener('window:scroll')
  manejarScroll() {
    const estaEnElFondo = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300;

    if (!this.cargando && this.hayMasPaginas && estaEnElFondo) {
      this.paginaActual++;
      this.cargarUsuarios(this.paginaActual);
    }

    this.mostrarBotonSubir = window.pageYOffset > 300;
  }

  volverArriba(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getAvatarPath(avatar: string): string {
    return `/avatares/${avatar}.gif`;
  }
}