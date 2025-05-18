import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecommendationService } from '../../services/recomendation.service';
import { PeliculaCardComponent } from '../pelicula-card/pelicula-card.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, PeliculaCardComponent],
  templateUrl: './recomendaciones.component.html',
  styleUrls: ['./recomendaciones.component.css']
})
export class RecomendacionesComponent implements OnInit {
  recommendations: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  isPremium: boolean = true; // Temporalmente true para probar, luego se obtendrá del usuario

  constructor(
    private recommendationService: RecommendationService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    // Verificar si el usuario es premium (temporalmente siempre es true)
    // En el futuro:
    // this.isPremium = this.authService.getCurrentUser().isPremium;

    if (this.isPremium) {
      this.loading = true;
      this.recommendationService.getPersonalizedRecommendations().subscribe({
        next: (data) => {
          this.recommendations = data;
          console.log(this.recommendations)
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar recomendaciones';
          this.loading = false;
          console.error('Error cargando recomendaciones:', error);
        }
      });
    }
  }

  refreshRecommendations(): void {
    this.loading = true;
    this.error = null;

    // Llamar al servicio con forceRefresh = true
    this.recommendationService.getPersonalizedRecommendations(15, true).subscribe({
      next: (data) => {
        this.recommendations = data;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al actualizar recomendaciones';
        this.loading = false;
        console.error('Error al actualizar recomendaciones:', error);
      }
    });
  }

  scrollSection(direction: 'left' | 'right'): void {
    const container = document.getElementById('recomendaciones');
    if (!container) return;

    const scrollAmount = direction === 'right' ? 300 : -300;
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }
}