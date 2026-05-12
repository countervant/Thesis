import CLIENTRA2 from "../assets/CLIENTRA2.png";

const AppLoadingScreen = () => (
  <main className="grid min-h-screen place-items-center bg-white px-6 text-neutral-950 dark:bg-[#111111] dark:text-white">
    <section className="flex flex-col items-center">
      <span className="relative grid h-24 w-24 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-pink-200 border-t-[#dc4fb2] border-r-[#dc4fb2] animate-spin" />
        <span className="absolute inset-2 rounded-full border border-pink-100 border-b-[#df4bb4]" />
        <img src={CLIENTRA2} alt="Clientra" className="h-16 w-16 object-contain" />
      </span>
      <p
        className="mt-4 text-xl uppercase tracking-wide"
        style={{ fontFamily: "var(--font-bruno)" }}
      >
      Loading...
      </p>
    </section>
  </main>
);

export default AppLoadingScreen;
