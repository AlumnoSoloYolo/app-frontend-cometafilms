import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';
import { VotoColorPipe } from '../../shared/pipes/voto-color.pipe';
import { CommonModule } from '@angular/common';
import { PeliculasService } from '../../services/peliculas.service';
import { RouterModule } from '@angular/router';
import { UserMovieService } from '../../services/user.service';

@Component({
  selector: 'app-pelicula-card',
  standalone: true,
  imports: [VotoColorPipe, CommonModule, RouterModule],
  templateUrl: './pelicula-card.component.html',
  styleUrl: './pelicula-card.component.css'
})
export class PeliculaCardComponent implements OnInit {

  @Input() pelicula: any;
  listaGeneros: any[] = [];
  vista: boolean = false;
  pendiente: boolean = false;

  @Output() peliculaVistaAgregada = new EventEmitter<string>();
  @Output() peliculaVistaEliminada = new EventEmitter<string>();
  @Output() peliculaPendienteAgregada = new EventEmitter<string>();
  @Output() peliculaPendienteEliminada = new EventEmitter<string>();

  constructor(
    private pelisService: PeliculasService,
    private userService: UserMovieService
  ) { }

  ngOnInit(): void {
    this.generos();
    this.checkEstados();
  }

  private checkEstados(): void {
    if (this.pelicula?.id) {
      const movieIdString = this.pelicula.id.toString();

      const peliculasVistas = this.getPeliculasVistas();
      const peliculasPendientes = this.getPeliculasPendientes();

      this.vista = peliculasVistas.includes(movieIdString);
      this.pendiente = peliculasPendientes.includes(movieIdString);
    }
  }

  private getPeliculasVistas(): string[] {
    const vistas = localStorage.getItem('peliculasVistas');
    return vistas ? JSON.parse(vistas) : [];
  }

  private getPeliculasPendientes(): string[] {
    const pendientes = localStorage.getItem('peliculasPendientes');
    return pendientes ? JSON.parse(pendientes) : [];
  }

  private updatePeliculasVistas(peliculasVistas: string[]) {
    localStorage.setItem('peliculasVistas', JSON.stringify(peliculasVistas));
  }

  private updatePeliculasPendientes(peliculasPendientes: string[]) {
    localStorage.setItem('peliculasPendientes', JSON.stringify(peliculasPendientes));
  }

  generos(): void {
    this.pelisService.getGeneros().subscribe({
      next: (response) => {
        this.listaGeneros = response.genres;
      },
      error: (error) => {
        console.error("Error al consultar la lista de géneros", error)
      }
    });
  }

  nombreGeneros(genero_id: number): any {
    let genero = this.listaGeneros.find(genero => genero.id === genero_id)
    return genero ? genero.name : undefined;
  }

  toggleVista(event: Event): void {
    event.stopPropagation();

    if (this.vista) {
      this.removeFromVistas();
    } else {
      this.addToVistas();
    }
  }

  togglePendiente(event: Event): void {
    event.stopPropagation();

    if (this.pendiente) {
      this.removeFromPendientes();
    } else {
      this.addToPendientes();
    }
  }

  private addToVistas(): void {
    const movieIdString = this.pelicula.id.toString();

    this.userService.addPelisVistas(movieIdString).subscribe({
      next: () => {
        const peliculasVistas = this.getPeliculasVistas();
        const peliculasPendientes = this.getPeliculasPendientes();


        if (!peliculasVistas.includes(movieIdString)) {
          peliculasVistas.push(movieIdString);
          this.updatePeliculasVistas(peliculasVistas);
        }


        const indexPendiente = peliculasPendientes.indexOf(movieIdString);
        if (indexPendiente > -1) {
          peliculasPendientes.splice(indexPendiente, 1);
          this.updatePeliculasPendientes(peliculasPendientes);
        }

        this.peliculaVistaAgregada.emit(movieIdString);
        this.checkEstados();
      },
      error: (error) => {
        console.error(`Error al añadir ${this.pelicula.title} a la lista de vistas`, error);
      },
    });
  }

  private removeFromVistas(): void {
    const movieIdString = this.pelicula.id.toString();

    this.userService.removePelisVistas(movieIdString).subscribe({
      next: () => {
        const peliculasVistas = this.getPeliculasVistas();
        const index = peliculasVistas.indexOf(movieIdString);

        if (index > -1) {
          peliculasVistas.splice(index, 1);
          this.updatePeliculasVistas(peliculasVistas);
        }

        this.peliculaVistaEliminada.emit(movieIdString);
        this.checkEstados();
      },
      error: (error) => {
        console.error(`Error al eliminar ${this.pelicula.title} de vistas`, error);
      },
    });
  }

  private addToPendientes(): void {
    const movieIdString = this.pelicula.id.toString();

    this.userService.addPelisPendientes(movieIdString).subscribe({
      next: () => {
        const peliculasPendientes = this.getPeliculasPendientes();
        const peliculasVistas = this.getPeliculasVistas();


        if (!peliculasPendientes.includes(movieIdString)) {
          peliculasPendientes.push(movieIdString);
          this.updatePeliculasPendientes(peliculasPendientes);
        }


        const indexVista = peliculasVistas.indexOf(movieIdString);
        if (indexVista > -1) {
          peliculasVistas.splice(indexVista, 1);
          this.updatePeliculasVistas(peliculasVistas);
        }

        this.peliculaPendienteAgregada.emit(movieIdString);
        this.checkEstados();
      },
      error: (error) => {
        console.error(`Error al añadir ${this.pelicula.title} a pendientes`, error);
      },
    });
  }

  private removeFromPendientes(): void {
    const movieIdString = this.pelicula.id.toString();

    this.userService.removePelisPendientes(movieIdString).subscribe({
      next: () => {
        const peliculasPendientes = this.getPeliculasPendientes();
        const index = peliculasPendientes.indexOf(movieIdString);

        if (index > -1) {
          peliculasPendientes.splice(index, 1);
          this.updatePeliculasPendientes(peliculasPendientes);
        }

        this.peliculaPendienteEliminada.emit(movieIdString);
        this.checkEstados();
      },
      error: (error) => {
        console.error(`Error al eliminar ${this.pelicula.title} de pendientes`, error);
      },
    });
  }
}