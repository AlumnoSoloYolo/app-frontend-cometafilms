import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PeliculasService } from '../../services/peliculas.service';
import { CommonModule } from '@angular/common';
import { PeliculaCardComponent } from '../pelicula-card/pelicula-card.component';

@Component({
  selector: 'app-credito-detalles',
  standalone: true,
  imports: [RouterModule, CommonModule, PeliculaCardComponent],
  templateUrl: './credito-detalles.component.html',
  styleUrl: './credito-detalles.component.css'
})
export class CreditoDetallesComponent implements OnInit {

  person: any = {}

  constructor(private pelisService: PeliculasService, private route: ActivatedRoute) {
    window.scrollTo({
      top: -100,
      left: 0,
      behavior: 'smooth'
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.cargarDetallesPersona(id);
    });
    window.scrollTo({
      top: -100,
      left: 0,
      behavior: 'smooth'
    });

  }

  cargarDetallesPersona(id: string): void {
    this.pelisService.getDetallesPersona(id).subscribe({
      next: (data) => {
        this.person = data;
        // console.log(data)
      },
      error: (error) => {
        console.error("No se ha podido cargar los detalles de la perosna", error)
      }
    })
  }




  scrollSection(sectionId: string, direction: 'left' | 'right'): void {
    const container = document.getElementById(sectionId);
    if (!container) return;

    const scrollContent = container.querySelector('.movie-scroll-content') as HTMLElement;
    if (!scrollContent) return;

    const itemWidth = scrollContent.querySelector('.movie-scroll-item')?.clientWidth || 300; // Ancho de cada tarjeta
    const scrollAmount = itemWidth * 2; // Desplazamiento igual al ancho de una tarjeta
    const currentScroll = scrollContent.scrollLeft; // Posición actual del scroll
    const totalWidth = scrollContent.scrollWidth; // Ancho total del contenido
    const visibleWidth = scrollContent.clientWidth; // Ancho visible del contenedor

    let newScroll = direction === 'right'
      ? Math.min(currentScroll + scrollAmount, totalWidth - visibleWidth) // Desplazar a la derecha
      : Math.max(currentScroll - scrollAmount, 0); // Desplazar a la izquierda

    scrollContent.scrollTo({
      left: newScroll,
      behavior: 'smooth' // Desplazamiento suave
    });
  }
}
