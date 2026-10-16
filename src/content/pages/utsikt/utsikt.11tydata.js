module.exports = {
  layout: "utsikt-detail.njk",
  eleventyComputed: {
    // "Utsikt #2 2026: Glädje trots orostider". The year is taken from the
    // issue date. Pages without a number (the archive page) keep their title.
    title: data => {
      if (data.number === undefined || data.number === null || data.number === "") {
        return data.title;
      }
      const year = new Date(data.date).getUTCFullYear();
      const base = `Utsikt #${data.number} ${year}`;
      return data.theme ? `${base}: ${data.theme}` : base;
    },
  },
};
