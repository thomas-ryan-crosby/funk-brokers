let pdfjsPromise;

export const getPdfjs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjsModule, workerModule] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf'),
        import('pdfjs-dist/legacy/build/pdf.worker.min?url'),
      ]);
      const pdfjsLib = pdfjsModule.default || pdfjsModule;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default || workerModule;
      return pdfjsLib;
    })();
  }
  return pdfjsPromise;
};
