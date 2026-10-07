/* Prime Piece — enquiry photo preparation.
   Phone photos (often 2–5MB+) are resized and re-encoded in the browser before
   they're sent, so every upload fits under the enquiry APIs' 3,000,000-character
   attachment cap and Vercel's 4.5MB request limit.

   PPPhoto.prepare(file) → Promise<{ base64, mime, width, height, bytes }>
   Rejects with an Error whose .code is 'type' | 'decode' | 'size'; pass it to
   PPPhoto.message(err) for wording to show the customer. */
(function () {
  var EDGES = [2000, 1600, 1200];     // longest side, tried in order
  var QUALITIES = [0.82, 0.72, 0.62]; // JPEG quality, tried in order at each size
  var TARGET_B64 = 2400000;           // base64 characters (~1.8MB of JPEG) — well inside both limits
  var MAX_INPUT = 40 * 1024 * 1024;   // refuse anything absurd before trying to decode it

  function fail(code) { var e = new Error(code); e.code = code; return e; }

  function decodeWithImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(fail('decode')); };
      img.src = url;
    });
  }

  function decode(file) {
    // createImageBitmap applies the photo's EXIF orientation, so portrait phone shots stay upright.
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return decodeWithImg(file); });
    }
    return decodeWithImg(file);
  }

  function toBlob(canvas, quality) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', quality); });
  }

  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(fail('decode')); };
      r.readAsDataURL(blob);
    });
  }

  async function prepare(file) {
    if (!file) throw fail('type');
    var looksLikeImage = /^image\//.test(file.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(file.name || '');
    if (!looksLikeImage) throw fail('type');
    if (file.size > MAX_INPUT) throw fail('size');

    var src;
    try { src = await decode(file); } catch (e) { throw fail('decode'); }
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    if (!w || !h) throw fail('decode');

    try {
      for (var i = 0; i < EDGES.length; i++) {
        var scale = Math.min(1, EDGES[i] / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';               // transparent PNGs become white, not black
        ctx.fillRect(0, 0, cw, ch);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, cw, ch);
        for (var j = 0; j < QUALITIES.length; j++) {
          var blob = await toBlob(canvas, QUALITIES[j]);
          if (!blob) throw fail('decode');
          var b64 = await toBase64(blob);
          if (b64 && b64.length <= TARGET_B64) {
            return { base64: b64, mime: 'image/jpeg', width: cw, height: ch, bytes: blob.size };
          }
        }
      }
    } finally {
      if (src && src.close) src.close();
    }
    throw fail('size');
  }

  function message(err) {
    switch (err && err.code) {
      case 'type': return 'Please choose a photo (JPG, PNG or HEIC).';
      case 'decode': return "We couldn't read that photo — please try a JPG or PNG.";
      case 'size': return "That photo is too large to send — please try another.";
      default: return "We couldn't prepare that photo — please try another.";
    }
  }

  window.PPPhoto = { prepare: prepare, message: message };
})();
