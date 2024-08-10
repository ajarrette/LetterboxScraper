import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Film, LetterboxdScraperService } from './letterboxd-scraper.service';
import { BehaviorSubject, first } from 'rxjs';
import { FilmTableComponent } from './film-table/film-table.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FilmTableComponent, MatButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private letterboxdService: LetterboxdScraperService) {}
  filmsSource = new BehaviorSubject<Film[]>([]);
  films$ = this.filmsSource.asObservable();
  page = 1;

  onGetFilms() {
    this.letterboxdService
      .getFilms(this.page++)
      .pipe(first())
      .subscribe((newFilms) => {
        const updatedFilmList = newFilms.reduce((acc, curr) => {
          if (acc.findIndex((film) => film.id === curr.id) === -1) {
            acc.push(curr);
          }
          return acc;
        }, this.filmsSource.value.slice());

        this.filmsSource.next(updatedFilmList);
      });
  }
}
