import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, forkJoin, map, Observable, switchMap } from 'rxjs';

export interface Film {
  id: string;
  link: string;
  name: string;
  rating: number;
  slug: string;
  views: number;
  year: number;
}

const defaultPopularityThreshold = 400000;

const popularityDictionary: Record<number, number> = {
  1900: 20000,
  1901: 20000,
  1902: 20000,
  1903: 20000,
  1904: 20000,
  1905: 25000,
  1906: 25000,
  1907: 25000,
  1908: 25000,
  1909: 25000,
  1910: 30000,
  1911: 30000,
  1912: 30000,
  1913: 30000,
  1914: 30000,
  1915: 35000,
  1916: 35000,
  1917: 35000,
  1918: 35000,
  1919: 35000,
  1920: 40000,
  1921: 40000,
  1922: 40000,
  1923: 40000,
  1924: 40000,
  1925: 45000,
  1926: 45000,
  1927: 45000,
  1928: 45000,
  1929: 45000,
  1930: 50000,
  1931: 52000,
  1932: 53000,
  1933: 55000,
  1934: 57000,
  1935: 60000,
  1936: 62000,
  1937: 65000,
  1938: 68000,
  1939: 70000,
  1940: 72000,
  1941: 73000,
  1942: 75000,
  1943: 75000,
  1944: 76000,
  1945: 77000,
  1946: 80000,
  1947: 80000,
  1948: 80000,
  1949: 80000,
  1950: 85000,
  1951: 85000,
  1952: 85000,
  1953: 85000,
  1954: 85000,
  1955: 85000,
  1956: 85000,
  1957: 85000,
  1958: 85000,
  1959: 85000,
  1960: 90000,
  1961: 90000,
  1962: 90000,
  1963: 90000,
  1964: 90000,
  1965: 95000,
  1966: 95000,
  1967: 95000,
  1968: 95000,
  1969: 95000,
  1970: 100000,
  1971: 100000,
  1972: 100000,
  1973: 100000,
  1974: 100000,
  1975: 110000,
  1976: 110000,
  1977: 110000,
  1978: 110000,
  1979: 110000,
  1980: 120000,
  1981: 130000,
  1982: 140000,
  1983: 150000,
  1984: 160000,
  1985: 170000,
  1986: 180000,
  1987: 190000,
  1988: 200000,
  1989: 200000,
  1990: 200000,
  1991: 210000,
  1992: 220000,
  1993: 230000,
  1994: 240000,
  1995: 250000,
  1996: 260000,
  1997: 270000,
  1998: 280000,
  1999: 290000,
  2000: 300000,
  2001: 300000,
  2002: 300000,
  2003: 300000,
  2004: 300000,
  2005: 300000,
  2006: 300000,
  2007: 300000,
  2008: 300000,
  2009: 300000,
};

const ignoreList = new Set<string>([
  'a-charlie-brown-christmas', // TV movie
  'bo-burnham-inside', // TV special
  'chernobyl', // TV mini series
  'hamilton-2020', // Concert
  'la-jetee', // Short film
  'man-with-a-movie-camera', // Documentary
  'meshes-of-the-afternoon', // Short film
  'normal-people-2020', // TV mini series
  'the-queens-gambit', // TV mini series
  'stop-making-sense', // Concert
  'twin-peaks', // TV show
]);

@Injectable({
  providedIn: 'root',
})
export class LetterboxdScraperService {
  private baseUrl = 'https://letterboxd.com';
  constructor(private http: HttpClient) {}

  getFilms(pageNumber: number = 1): Observable<Film[]> {
    const url = `${this.baseUrl}/films/ajax/by/rating/page/${pageNumber}/`;
    return this.http
      .get(url, {
        responseType: 'text',
      })
      .pipe(
        map((results) => {
          const movies = results.split('<li class="listitem poster-container"');
          movies.shift();
          return movies;
        }),
        map((movies: string[]) => {
          const letterboxdMovies: any[] = [];
          movies.forEach((filmHtml) => {
            const movieOverview = {
              id: this.getFilmId(filmHtml),
              link: this.getFilmLink(filmHtml),
              name: this.getFilmName(filmHtml),
              rating: this.getFilmRating(filmHtml),
              slug: this.getFilmSlug(filmHtml),
            };

            letterboxdMovies.push(movieOverview);
          });

          return letterboxdMovies;
        }),
        switchMap((films) => {
          const filmsStats: Observable<Film>[] = [];
          films.forEach((film) => {
            const stats$ = this.http
              .get(`https://letterboxd.com/csi/film/${film.slug}/stats/`, {
                responseType: 'text',
              })
              .pipe(
                map((statsHtml) => {
                  return { ...film, views: this.getFilmViews(statsHtml) };
                })
              );
            filmsStats.push(stats$);
          });

          return forkJoin(filmsStats);
        }),
        switchMap((films) => {
          const filmsStats: Observable<Film>[] = [];
          films.forEach((film) => {
            const stats$ = this.http
              .get(
                `https://letterboxd.com/ajax/poster/film/${film.slug}/hero/230x345/`,
                {
                  responseType: 'text',
                }
              )
              .pipe(
                delay(500),
                map((html) => {
                  return { ...film, year: this.getFilmYear(html) };
                })
              );
            filmsStats.push(stats$);
          });

          return forkJoin(filmsStats);
        }),
        map((films) => {
          console.log({ films });
          return films;
        }),
        map((films) => {
          return films.filter((film) => {
            const popularityThreshold =
              popularityDictionary[film.year] || defaultPopularityThreshold;
            return (
              film.views > popularityThreshold && !ignoreList.has(film.slug)
            );
          });
        })
      );
  }

  private getFilmId(filmHtml: string): string {
    return this.getSubString(filmHtml, 'data-film-id', 14);
  }

  private getFilmLink(filmHtml: string): string {
    return this.getSubString(filmHtml, 'data-target-link', 18);
  }

  private getFilmName(filmHtml: string): string {
    return this.getSubString(filmHtml, '" alt="', 7);
  }

  private getFilmRating(filmHtml: string): number {
    return +this.getSubString(filmHtml, '-rating=', 9);
  }

  private getFilmSlug(filmHtml: string): string {
    return this.getSubString(filmHtml, 'data-film-slug', 16);
  }

  private getFilmViews(statsHtml: string): number {
    return +this.getSubString(statsHtml, 'Watched by ', 11, '&nbsp;').replace(
      /,/g,
      ''
    );
  }

  private getFilmYear(html: string): number {
    return +this.getSubString(html, 'release-year', 14);
  }

  private getSubString(
    filmHtml: string,
    key: string,
    offset: number,
    endingDelimiter = '"'
  ): string {
    let startIndex = filmHtml.indexOf(key);
    if (startIndex < 0) {
      return '';
    }

    startIndex += offset;
    const endIndex = filmHtml.indexOf(endingDelimiter, startIndex);
    return filmHtml.substring(startIndex, endIndex);
  }
}
