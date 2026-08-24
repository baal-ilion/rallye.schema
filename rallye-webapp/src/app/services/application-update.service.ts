import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

export type ApplicationDomain = 'SUBMITTED_FORMS' | 'RESULTS' | 'TEAMS' | 'CONFIGURATION' | 'DATABASE' | 'LOGS' | 'APPLICATION';
export interface ApplicationUpdate { domain: ApplicationDomain | 'RESYNC'; path?: string; method?: string; }

@Injectable({ providedIn: 'root' })
export class ApplicationUpdateService {
  private readonly updatesSubject = new Subject<ApplicationUpdate>();
  readonly updates$ = this.updatesSubject.asObservable();
  private readonly client: Client;
  private hasConnected = false;

  constructor() {
    this.client = new Client({ webSocketFactory: () => new SockJS('/ws-ranking'), reconnectDelay: 5000 });
    this.client.onConnect = () => {
      if (this.hasConnected) {
        this.updatesSubject.next({ domain: 'RESYNC' });
      }
      this.hasConnected = true;
      this.client.subscribe('/topic/applicationUpdate', message => {
        try { this.updatesSubject.next(JSON.parse(message.body) as ApplicationUpdate); }
        catch (error) { console.error('Événement global invalide', error); }
      });
    };
    this.client.onStompError = frame => console.error('Erreur de synchronisation globale', frame.headers['message']);
    this.client.activate();
  }
}
