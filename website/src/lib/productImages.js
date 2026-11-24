// Separates the images already in the bucket (they only have an id) from the new
// ones (they only have a File). Only the new files are uploaded. Existing ids, such
// as the ones copied from another product, are reused and never uploaded again.
//
// items: [{ id }  or  { file }]   (the sample image uploader uses { kind: 'existing' | 'new' })
export const splitImageItems = (items = []) => ({
  existing: items.filter((i) => !isNewItem(i)),
  fresh: items.filter(isNewItem),
});

export const isNewItem = (item) => item?.kind === 'new' || Boolean(item?.file && !item?.id);

// Returns { ids, uploadedIds }:
//   ids         one bucket id per item, in the same order as `items`
//   uploadedIds only the ids created now (delete them again if the save fails)
// Throws when a new file cannot be uploaded or an item has no id at all.
export async function resolveImageIds(items, productService) {
  const { fresh } = splitImageItems(items);
  let uploadedIds = [];
  if (fresh.length) {
    const uploaded = await productService.uploadImages(fresh.map((i) => i.file));
    if (!uploaded || uploaded.length !== fresh.length) {
      if (uploaded?.length) await productService.deleteImages(uploaded.map((f) => f.$id));
      throw new Error('Image upload failed.');
    }
    uploadedIds = uploaded.map((f) => f.$id);
  }
  let next = 0;
  const ids = items.map((item) => (isNewItem(item) ? uploadedIds[next++] : item.id));
  if (ids.some((id) => !id)) {
    if (uploadedIds.length) await productService.deleteImages(uploadedIds);
    throw new Error('Every image needs an id. Remove the broken image and add it again.');
  }
  return { ids, uploadedIds };
}
