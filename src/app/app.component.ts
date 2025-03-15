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

        updatedFilmList.sort((a, b) => b.weightedRating - a.weightedRating);
        updatedFilmList.forEach((film, i) => {
          film.weightedRanking = i + 1;
          film.difference = film.ranking - film.weightedRanking;
        });

        this.filmsSource.next(updatedFilmList.slice(0, 250));
      });
  }

  export() {
    this.films$.subscribe((films) => {
      let output: string = '';
      for (let i = 0; i < films?.length; ++i) {
        const film = films[i];
        output += `https://letterboxd.com${film.link}\n`;
      }
      console.log(output);
    });
  }
}
