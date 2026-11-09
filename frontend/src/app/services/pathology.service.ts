import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import {Pathology} from "../interfaces/pathology.interface";

@Injectable({
  providedIn: 'root',
})
export class PathologyService {
  private apiUrl = `/services/datamodels`;
  private pathologies: any[] = []; // Cache for all pathologies
  private pathologiesLoaded = false; // Flag to track cache loading

  constructor(private http: HttpClient) {}

  // Fetch and cache all pathologies
  loadAllPathologies(): Observable<any[]> {
    if (!this.pathologiesLoaded) {
      return this.http.get<any[]>(this.apiUrl).pipe(
        tap((pathologies) => {
          this.pathologies = pathologies;
          this.pathologiesLoaded = true;
        }),
        catchError((error) => {
          console.error('Error fetching pathologies:', error);
          return of([]);
        })
      );
    }
    return of(this.pathologies);
  }

  // Retrieve all pathologies, using the cache if available
  getAllReleasedPathologies(): Observable<any[]> {

    // Ensure pathologies are loaded before returning
    return this.loadAllPathologies().pipe(
      map(() => this.pathologies.filter(pathology => pathology.released === true))
    );
  }

  exportPathology(pathology: Pathology, fileType: 'json' | 'xlsx'): void {
    const url = fileType === 'json'
        ? `${this.apiUrl}/${pathology.uuid}`
        : `${this.apiUrl}/${pathology.uuid}/export`;

    if (fileType === 'json') {
      this.http.get<any>(url, { responseType: 'json' }).subscribe(
        (response) => {
          const beautifiedJson = JSON.stringify(response, null, 2);
          const blob = new Blob([beautifiedJson], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = `${pathology.code}_${pathology.version}.json`;
          link.click();
        },
        (error) => {
          console.error('Error exporting pathology JSON:', error);
        }
      );
    } else {
      this.http.get(url, { responseType: 'blob' }).subscribe(
        (response) => {
          const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = `${pathology.code}_${pathology.version}.xlsx`;
          link.click();
        },
        (error) => {
          console.error('Error exporting pathology XLSX:', error);
        }
      );
    }
  }

  reloadPathologies(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((pathologies) => {
        this.pathologies = pathologies;
        this.pathologiesLoaded = true;
      }),
      catchError((error) => {
        console.error('Error reloading pathologies:', error);
        return of([]);
      })
    );
  }

  // Get all pathologies from cache or API
  getAllPathologies(): Observable<any[]> {
    return this.loadAllPathologies();
  }



  // Get pathologies by federation IDs
  getPathologiesByIds(ids: string[]): Observable<any[]> {
    return this.getAllPathologies().pipe(
      map((pathologies) => pathologies.filter((pathology) => ids.includes(pathology.uuid))),
      catchError((error) => {
        console.error('Error fetching pathologies by IDs:', error);
        return of([]);
      })
    );
  }

  // Categorize pathologies into cross-sectional and longitudinal
  categorizePathologies(pathologies: Pathology[]): {
    crossSectional: Pathology[];
    longitudinal: Pathology[];
  } {
    const crossSectional = pathologies.filter((pathology) => !pathology.longitudinal);
    const longitudinal = pathologies.filter((pathology) => pathology.longitudinal);

    return { crossSectional, longitudinal };
  }

  // Convert pathology to D3 hierarchy format with variable count for groups
convertToD3Hierarchy(data: any): any {
  const convertVariables = (variables: any[]): any[] =>
    variables.map((v) => ({
      name: v.label,
      value: 1,
      ...v,
    }));

  const convertGroups = (groups: any[]): any[] =>
    groups.map((g: any) => {
      const variableNodes = convertVariables(g.variables || []);
      const groupNodes = convertGroups(g.groups || []);
      const totalVariableCount = variableNodes.length + groupNodes.reduce((count, group) => count + (group.variableCount || 0), 0);

      return {
        name: g.label,
        code: g.code,
        variableCount: totalVariableCount, // Track total variables in the group and subgroups
        children: [...variableNodes, ...groupNodes],
      };
    });

  const rootVariables = convertVariables(data.variables || []);
  const rootGroups = convertGroups(data.groups || []);
  const rootVariableCount = rootVariables.length + rootGroups.reduce((count, group) => count + (group.variableCount || 0), 0);

  return {
    name: data.label,
    code: data.code,
    variableCount: rootVariableCount, // Track total variables for the root
    children: [...rootVariables, ...rootGroups],
  };
}

  //CRUD:

  deletePathology(pathologyId: string): Observable<any[]> {
    return this.http.delete<void>(`${this.apiUrl}/${pathologyId}`).pipe(
      switchMap(() => this.reloadPathologies()), // Reload pathologies after deletion
      catchError((error) => {
        console.error('Error deleting pathology:', error);
        return throwError(() => error);
      })
    );
  }

  releasePathology(pathologyId: string): Observable<any[]> {
    return this.http.post<void>(`${this.apiUrl}/${pathologyId}/release`, {}).pipe(
      switchMap(() => this.reloadPathologies()), // Reload pathologies after release
      catchError((error) => {
        console.error('Error releasing pathology:', error);
        return throwError(() => error);
      })
    );
  }


  createPathologyFromExcel(file: File, version: string, longitudinal: string): Observable<any[]> {
    const url = `${this.apiUrl}/import`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('longitudinal', longitudinal);

    return this.http.post<void>(url, formData).pipe(
      switchMap(() => this.reloadPathologies()), // Reload pathologies after creation
      tap(() => console.log('Pathology created successfully from Excel.')),
      catchError((error: HttpErrorResponse) => {
        console.error('Sanitized error response:', error.error.replace(/<EOL>/g, '\n'));
        const errorMessage = this.extractErrorMessage(error, 'creating Excel pathology');
        return throwError(() => errorMessage);
        }
      )
    )
  }

  private extractErrorMessage(error: HttpErrorResponse, action: string): string {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      return `An error occurred while ${action}: ${error.error.message}`;
    } else if (typeof error.error === 'string') {
      try {
        // Replace <EOL> with actual newlines
        const sanitizedError = error.error.replace(/<EOL>/g, '\n').trim();

        // Extract JSON from the string if it exists
        const jsonStartIndex = sanitizedError.indexOf('{');
        const jsonEndIndex = sanitizedError.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
          const jsonString = sanitizedError.substring(jsonStartIndex, jsonEndIndex + 1);
          const parsedError = JSON.parse(jsonString);
          if (parsedError.error) {
            return `Error while ${action}: ${parsedError.error}`;
          }
        }

        // If JSON parsing fails, return sanitized string
        return `An unexpected error occurred while ${action}: ${sanitizedError}`;
      } catch (e) {
        // If an error occurs during parsing, return the raw error
        return `An unexpected error occurred while ${action}: ${error.error}`;
      }
    } else if (error.error && error.error.error) {
      // Error object already parsed
      return `Error while ${action}: ${error.error.error}`;
    }

    // Default fallback
    return `An unexpected error occurred while ${action}: ${error.message}`;
  }

  createPathologyFromJson(file: File): Observable<void> {
    const url = `${this.apiUrl}`;
    return new Observable<void>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const pathologyDTO = JSON.parse(reader.result as string);
          this.http.post<void>(url, pathologyDTO).subscribe({
            next: () => {
              console.log('Pathology created successfully from JSON.');
              this.reloadPathologies().subscribe(() => {
                console.log('Pathologies reloaded after JSON creation.');
                observer.next();
                observer.complete();
              });
            },
            error: (error: HttpErrorResponse) => {
              observer.error(this.extractErrorMessage(error, 'creating JSON pathology'));
            },
          });
        } catch (error) {
          observer.error('Error parsing JSON file: ' + error);
        }
      };
      reader.readAsText(file);
    });
  }


  updatePathologyFromJson(pathologyId: string, file: File): Observable<void> {
    const url = `${this.apiUrl}/${pathologyId}`;
    return new Observable<void>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const pathologyDTO = JSON.parse(reader.result as string);
          this.http.put<void>(url, pathologyDTO).subscribe({
            next: () => {
              console.log('Pathology updated successfully (JSON).');
              this.reloadPathologies().subscribe(() => {
                console.log('Pathologies reloaded after JSON update.');
                observer.next();
                observer.complete();
              });
            },
            error: (error: HttpErrorResponse) => {
              observer.error(this.extractErrorMessage(error, 'updating JSON pathology'));
            },
          });
        } catch (error) {
          observer.error('Error parsing JSON file: ' + error);
        }
      };
      reader.readAsText(file);
    });
  }
  updatePathologyFromExcel(pathologyId: string, file: File, version: string, longitudinal: string): Observable<any[]> {
    const url = `${this.apiUrl}/${pathologyId}/excel`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('longitudinal', longitudinal);

    return this.http.put<void>(url, formData).pipe(
      switchMap(() => this.reloadPathologies()), // Reload pathologies after update
      tap(() => console.log('Pathology updated successfully (Excel).')),
      catchError((error: HttpErrorResponse) => {
        const errorMessage = this.extractErrorMessage(error, 'updating Excel pathology');
        return throwError(() => errorMessage);
      })
    );
  }
}
