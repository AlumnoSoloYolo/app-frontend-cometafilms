import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { PeliculasService } from '../../services/peliculas.service';
import { PeliculaCardComponent } from '../pelicula-card/pelicula-card.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AbstractControl } from '@angular/forms';
import { ValidationErrors } from '@angular/forms';


// Definimos la interfaz para la respuesta de la API
interface MovieResponse {
  results: any[];
  total_results: number;
  total_pages: number;
}


@Component({
  selector: 'app-busqueda-peliculas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PeliculaCardComponent],
  templateUrl: './busqueda-peliculas.component.html',
  styleUrl: './busqueda-peliculas.component.css'
})
export class BusquedaPeliculasComponent {
  // Declaración del formulario
  searchForm: FormGroup;

  // Variables de estado
  peliculas: any[] = [];
  generos: any[] = [];
  cargando = false;
  paginaActual = 1;
  hayMasPaginas = true;
  resultadosTotales = 0;
  mostrarBotonSubir = false;

  // Opciones para los selectores
  yearOptions = this.opcionesAnio();
  sortOptions = [
    { value: 'popularity.desc', label: 'Popularidad (Mayor a menor)' },
    { value: 'popularity.asc', label: 'Popularidad (Menor a mayor)' },
    { value: 'vote_average.desc', label: 'Valoración (Mayor a menor)' },
    { value: 'vote_average.asc', label: 'Valoración (Menor a mayor)' },
    { value: 'release_date.desc', label: 'Fecha (Más recientes)' },
    { value: 'release_date.asc', label: 'Fecha (Más antiguas)' },
    { value: 'title.asc', label: 'Título (A-Z)' },
    { value: 'title.desc', label: 'Título (Z-A)' }
  ];

  constructor(
    private fb: FormBuilder,
    private pelisService: PeliculasService,
    private route: ActivatedRoute
  ) {
    // inicializar el formulario usando FormBuilder

    this.searchForm = this.fb.group({
      query: ['', [
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      year: ['', [
        Validators.pattern(/^\d{4}$/),
        Validators.min(1900),
        Validators.max(new Date().getFullYear())
      ]],
      genres: [[]],
      sortBy: ['popularity.desc'],
      minRating: ['', [
        Validators.min(0),
        Validators.max(10),
        this.validarMinMax
      ]],
      maxRating: ['', [
        Validators.min(0),
        Validators.max(10),
        this.validarMinMax
      ]]
    }, {
      validators: this.validarRatingRange
    });
  }

  private validarMinMax(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const valor = control.value;
    if (isNaN(valor)) return { 'numeroInvalido': true };

    const numero = Number(valor);
    if (numero < 0 || numero > 10) return { 'rangoInvalido': true };

    return null;
  }


  // Validador personalizado para el rango de valoración
  private validarRatingRange(group: FormGroup) {
    const min = group.get('minRating')?.value;
    const max = group.get('maxRating')?.value;
    return (min && max && Number(min) > Number(max)) ?
      { ratingRange: true } : null;
  }

  // Generador de opciones de años
  private opcionesAnio(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: currentYear - 1900 + 2 },
      (_, i) => currentYear + 1 - i
    );
  }


  ngOnInit() {
    this.cargarDatosIniciales();
    this.configurarBusquedaAutomatica();
    this.cargarPeliculas();
  }

  // Método para cargar datos iniciales
  private cargarDatosIniciales() {
    // Cargamos los géneros
    this.pelisService.getGeneros().subscribe({
      next: (response) => this.generos = response.genres,
      error: (error) => console.error('Error cargando géneros:', error)
    });

    // Verificamos si hay una búsqueda en la URL
    this.route.queryParams.subscribe(params => {
      if (params['query']) {
        this.searchForm.patchValue({ query: params['query'] });
        this.buscar();
      }
    });
  }

  // Configuración de la búsqueda automática
  private configurarBusquedaAutomatica() {
    this.searchForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.searchForm.valid) {
        this.buscar();
      }
    });
  }

  // Método principal de búsqueda
  buscar() {
    if (this.searchForm.invalid) return;

    this.cargando = true;
    this.paginaActual = 1;
    this.peliculas = [];

    this.realizarBusqueda();
  }

  // Método para cargar más películas (scroll infinito)
  @HostListener('window:scroll')
  manejarScroll() {
    const estaEnElFondo = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;

    if (!this.cargando && this.hayMasPaginas && estaEnElFondo) {
      this.paginaActual++;
      this.realizarBusqueda(true); // true indica que es carga adicional
    }

    this.mostrarBotonSubir = window.pageYOffset > 300;
  }

  // Método que realiza la petición a la API
  private realizarBusqueda(esScrollInfinito: boolean = false) {
    const params = this.prepararParametros();

    this.pelisService.busquedaAvanzadaPeliculas(params).subscribe({
      next: (response: MovieResponse) => {
        if (esScrollInfinito) {
          // Agregamos las nuevas películas a las existentes
          this.peliculas = [...this.peliculas, ...response.results];
        } else {
          // Reemplazamos las películas existentes
          this.peliculas = response.results;
        }

        this.resultadosTotales = response.total_results;
        this.hayMasPaginas = response.results.length > 0;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error en la búsqueda:', error);
        this.cargando = false;
      }
    });
  }

  // Prepara los parámetros de búsqueda
  private prepararParametros() {
    const formValue = this.searchForm.value;
    const params: any = {
      page: this.paginaActual,
      sortBy: formValue.sortBy || 'popularity.desc'
    };

    // Solo añadimos los parámetros que tienen valor
    if (formValue.query?.trim()) params.query = formValue.query.trim();
    if (formValue.year) params.year = formValue.year;
    if (formValue.genres?.length) params.genreIds = formValue.genres.filter(Boolean);
    if (formValue.minRating) params.minRating = formValue.minRating;
    if (formValue.maxRating) params.maxRating = formValue.maxRating;

    return params;
  }


  getErrorMessage(controlName: string): string {
    const control = this.searchForm.get(controlName);
    if (!control?.errors) return '';


    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['minlength']) {
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    }
    if (control.errors['pattern']) {
      return 'Formato de año inválido';
    }
    if (control.errors['min']) {
      return `Valor mínimo: ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `Valor máximo: ${control.errors['max'].max}`;
    }
    if (control.errors['rangoInvalido']) {
      return 'La valoración debe estar entre 0 y 10';
    }

    return '';
  }


  private cargarPeliculas() {
    this.cargando = true;
    this.paginaActual++;

    const searchParams = this.prepararParametros();

    this.pelisService.busquedaAvanzadaPeliculas(searchParams).subscribe({
      next: (response: MovieResponse) => {
        if (response.results.length === 0) {
          this.hayMasPaginas = false;
        } else {
          this.peliculas = [...this.peliculas, ...response.results];
          this.resultadosTotales = response.total_results;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando más películas:', error);
        this.cargando = false;
      }
    });
  }

  // Verifica si un control tiene errores
  hasError(controlName: string): boolean {
    const control = this.searchForm.get(controlName);
    return !!(control && control.errors && (control.dirty || control.touched));
  }


  limpiarFiltros() {
    this.searchForm.reset({ sortBy: 'popularity.desc' });
    this.buscar();
  }


  volverArriba() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
