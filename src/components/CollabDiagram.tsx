import { Img } from './Img'

/** Three complementary roles meet at one table, from the brief to the building. */
export function CollabDiagram() {
  return (
    <div className="collab__visual" role="group" aria-label="Klien, perencana, dan pelaksana bekerja bersama dalam satu kolaborasi">
      <svg className="collab__connections" viewBox="0 0 640 640" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path className="collab__connection collab__connection--plan" d="M414 158 C468 190 436 258 366 284" />
        <path className="collab__connection collab__connection--client" d="M162 473 C187 403 232 373 273 358" />
        <path className="collab__connection collab__connection--build" d="M478 473 C453 403 408 373 367 358" />
      </svg>

      <figure className="collab__node collab__node--plan">
        <Img id="collab-planner" alt="" sizes="(min-width: 900px) 15vw, 28vw" style={{ backgroundColor: 'transparent' }} />
        <figcaption>
          <h3>Perencana</h3>
          <p>Desain yang siap dibangun</p>
        </figcaption>
      </figure>

      <figure className="collab__node collab__node--client">
        <Img id="collab-client" alt="" sizes="(min-width: 900px) 15vw, 28vw" style={{ backgroundColor: 'transparent' }} />
        <figcaption>
          <h3>Klien</h3>
          <p>Kebutuhan, tujuan &amp; anggaran</p>
        </figcaption>
      </figure>

      <figure className="collab__node collab__node--build">
        <Img id="collab-builder" alt="" sizes="(min-width: 900px) 15vw, 28vw" style={{ backgroundColor: 'transparent' }} />
        <figcaption>
          <h3>Pelaksana</h3>
          <p>Pelaksanaan di lapangan</p>
        </figcaption>
      </figure>

      <figure className="collab__node collab__node--together">
        <Img id="collab-together" alt="" sizes="(min-width: 900px) 16vw, 30vw" style={{ backgroundColor: 'transparent' }} />
        <figcaption>
          <h3>Kolaborasi</h3>
          <p>Satu meja. Satu tujuan.</p>
        </figcaption>
      </figure>
    </div>
  )
}
