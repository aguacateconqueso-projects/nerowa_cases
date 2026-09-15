/*
  El puerto de archivos: facturas del fabricante, comprobantes del correo,
  fotos de una devolucion. Ver `docs/panel-nerowa.md` §9.3.

  Se deja definido aunque la pestana 3 llegue en la fase 7.7, porque el
  adaptador de almacenamiento que se elija va a traer esto incluido y conviene
  saber ya que forma tiene.
*/

export interface ArchivoGuardado {
  id: string;
  nombre: string;
  tipo: string;
  bytes: number;
  /** URL para verlo. Puede caducar segun el adaptador. */
  url: string;
}

export interface Archivos {
  readonly nombre: string;
  guardar(nombre: string, tipo: string, datos: Uint8Array): Promise<ArchivoGuardado>;
  borrar(id: string): Promise<void>;
}
