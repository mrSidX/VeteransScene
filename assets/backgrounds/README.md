# Daily Rotating Background Images

This folder contains military/patriotic background images that rotate daily.

## How It Works

- **7 images** - one for each day of the week
- **Changes at midnight** - automatically switches to the next day's image
- **Vignette effect** - darkened edges for visual depth
- **Subtle darkening** - ensures content remains readable

## Image Naming Convention

The system looks for images named exactly like this:

```
military-bg-01.jpg  (Monday)
military-bg-02.jpg  (Tuesday)
military-bg-03.jpg  (Wednesday)
military-bg-04.jpg  (Thursday)
military-bg-05.jpg  (Friday)
military-bg-06.jpg  (Saturday)
military-bg-07.jpg  (Sunday)
```

## How to Add Your Images

1. **Download images** from these free sources:
   - [Unsplash Military](https://unsplash.com/s/photos/military-background)
   - [Pexels Patriotic](https://www.pexels.com/search/patriotic%20military%20background/)
   - [Pixabay Military](https://pixabay.com/images/search/military%20parade/)
   - [Freepik](https://www.freepik.com/free-photos-vectors/american-flag-military)

2. **Recommended image types**:
   - US flag waving or close-up
   - Military formations or parade
   - Military base or landscape
   - Military aircraft or equipment
   - Soldiers in action or silhouette
   - Patriotic imagery
   - Honor/memorial themed

3. **Image requirements**:
   - Minimum resolution: 1920x1080
   - Prefer landscape orientation (wider than tall)
   - File format: JPG (smaller file size)
   - Works best with varied imagery (don't use same image multiple times)

4. **Save images** with the names above to this folder

5. **Hard refresh** your browser (Ctrl+Shift+R) to see the new backgrounds

## Tips for Best Results

- **Download at highest available resolution** on each platform
- **Mix types**: use flag images, formations, aircraft, landscape, and honor photos
- **Test the look**: the vignette and darkening layer will make the images subtle
- **Keep file sizes reasonable**: aim for 200-500KB per image (use image compression if needed)
- **Consistency**: use images with similar quality and tone for a cohesive feel

## CSS Customization

The vignette and darkening are controlled in `daily-background.css`:

- **Vignette darkness**: Change the `rgba(0, 0, 0, 0.7)` value (higher = darker edges)
- **Overall darkness**: Change the `rgba(0, 0, 0, 0.4)` value (higher = darker background)

## Example Download Process

1. Go to [Unsplash Military Background](https://unsplash.com/s/photos/military-background)
2. Click an image you like
3. Download (usually a button at the bottom)
4. Rename to `military-bg-01.jpg`
5. Save to this folder
6. Repeat for remaining 6 days

All images from Unsplash, Pexels, and Pixabay are CC0 (free for any use, no attribution required).
