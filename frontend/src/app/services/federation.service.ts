import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Federation } from '../interfaces/federations.interface';
import { PathologyService } from './pathology.service';
import {Pathology} from "../interfaces/pathology.interface";

@Injectable({
  providedIn: 'root',
})
export class FederationService {
  private apiUrl = `/services/federations`;

  constructor(private http: HttpClient, private pathologyService: PathologyService) {}

  getFederationsWithPathologies(): Observable<Federation[]> {
    return this.http.get<Federation[]>(this.apiUrl).pipe(
      switchMap((federations) =>
        forkJoin(
          federations.map((federation) =>
            this.pathologyService.getPathologiesByIds(federation.dataModelIds).pipe(
              map((pathologies: Pathology[]) => ({
                ...federation,
                pathologies,
              })),
              catchError(() => of({
                ...federation,
                pathologies: [],
              }))
            )
          )
        )
      ),
      catchError(() => of([])) // Return an empty array if fetching federations fails
    );
  }

  // Create a new federation
  createFederation(federation: Federation): Observable<Federation> {
    return this.http.post<Federation>(this.apiUrl, federation).pipe(
      catchError((error) => {
        console.error('Error creating federation:', error);
        throw error;
      })
    );
  }

  updateFederation(code: string, federation: Federation): Observable<Federation> {
    const url = `${this.apiUrl}/${code}`; // Construct the URL with the federation code
    return this.http.put<Federation>(url, federation).pipe(
      catchError((error) => {
        console.error('Error updating federation:', error);
        throw error;
      })
    );
  }


  deleteFederation(federationCode: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${federationCode}`); // Use HttpClient's `delete` method
  }
}
