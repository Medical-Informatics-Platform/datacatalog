import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mip-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="on-dark">
      <div class="wrap grid">
        <div class="about">
          <img src="assets/logo.png" alt="MIP, Medical Informatics Platform" width="180" height="85" />
          <p>
            MIP runs analyses where the data lives. Hospitals keep patient records on their own premises; only
            aggregated, privacy-preserving results leave. This catalog publishes the metadata, never the records.
          </p>
        </div>
        <nav aria-label="Project links">
          <h2>Project</h2>
          <ul>
            <li><a href="https://github.com/Medical-Informatics-Platform/mip" target="_blank" rel="noopener">GitHub</a></li>
            <li><a href="https://www.ebrains.eu/tools/medical-informatics-platform" target="_blank" rel="noopener">EBRAINS</a></li>
            <li><a href="mailto:mip@chuv.ch">Support (mip&#64;chuv.ch)</a></li>
          </ul>
        </nav>
        <div>
          <h2>Powered by</h2>
          <ul class="logos">
            <li><img src="assets/footer/logo_ebrains.png" alt="EBRAINS" width="36" height="36" /></li>
            <li><img class="chuv" src="assets/footer/CHUV_Logo_Simple_BLANC.png" alt="CHUV" width="54" height="28" /></li>
            <li class="plate"><img src="assets/footer/athenarc.png" alt="Athena Research Center" width="62" height="35" /></li>
          </ul>
        </div>
      </div>
      <div class="wrap fund">
        <img src="assets/footer/eu-flag.svg" alt="European Union flag" width="56" height="38" />
        <p>
          Co-funded by the European Union under Horizon 2020 and Horizon Europe (EBRAINS 2.0, grant No. 101147319)
          and by the Swiss State Secretariat for Education, Research and Innovation (SERI, contract No. 23.00638).
        </p>
      </div>
    </footer>
  `,
  styles: [
    `
      footer { background: var(--footer-bg); color: var(--footer-ink); padding-block: 40px 28px; margin-top: 64px; }
      .grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 40px; }
      .about p { color: var(--footer-ink-2); max-width: 56ch; margin-top: 16px; font-size: 0.9375rem; }
      .about img { width: 180px; height: auto; }
      h2 { font-size: 0.9375rem; font-weight: 600; margin-bottom: 12px; color: #fff; }
      ul { display: grid; gap: 8px; }
      a { color: #cfd8ff; }
      a:hover { color: #fff; }
      .logos { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
      .logos img { height: 36px; width: auto; }
      .logos .chuv { height: 28px; }
      .plate { background: #fff; border-radius: var(--r-md); padding: 6px 12px; }
      .plate img { height: 26px; }
      .fund { display: flex; align-items: center; gap: 20px; margin-top: 36px; padding-top: 24px; border-top: 1px solid #4a4a46; color: var(--footer-ink-2); font-size: 0.875rem; }
      .fund img { flex: none; }
      @media (max-width: 860px) { .grid { grid-template-columns: 1fr; gap: 28px; } }
    `,
  ],
})
export class FooterComponent {}
