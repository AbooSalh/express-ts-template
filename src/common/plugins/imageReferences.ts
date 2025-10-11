/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from "mongoose";
import ImageModel from "@/common/models/Image/model";

type PluginOptions = {
  fields: string[]; // schema paths that hold image ObjectId(s)
};

function toIdArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((v) => v?.toString?.() || String(v));
  return [value?.toString?.() || String(value)];
}

async function addRefs(
  modelName: string,
  docId: any,
  field: string,
  ids: string[]
) {
  if (ids.length === 0) return;
  await ImageModel.updateMany(
    { _id: { $in: ids } },
    {
      $addToSet: {
        references: { model: modelName, field, docId, addedAt: new Date() },
      },
    }
  );
}

async function removeRefs(
  modelName: string,
  docId: any,
  field?: string,
  ids?: string[]
) {
  const match: any = { model: modelName, docId };
  if (field) match.field = field;
  if (ids && ids.length > 0) match.docId = docId; // ids filter is implicit by _id match below
  await ImageModel.updateMany(
    ids && ids.length > 0 ? { _id: { $in: ids } } : {},
    { $pull: { references: match } }
  );
}

async function diffAndSync(
  modelName: string,
  docId: any,
  field: string,
  prevIds: string[],
  nextIds: string[]
) {
  const prev = new Set(prevIds);
  const next = new Set(nextIds);
  const toAdd = [...next].filter((id) => !prev.has(id));
  const toRemove = [...prev].filter((id) => !next.has(id));
  if (toAdd.length > 0) await addRefs(modelName, docId, field, toAdd);
  if (toRemove.length > 0) await removeRefs(modelName, docId, field, toRemove);
}

export default function imageReferencesPlugin(
  schema: Schema,
  options: PluginOptions
) {
  const fields = options.fields || [];

  // When creating or saving a document
  schema.pre("save", async function () {
    const doc: any = this;
    const modelName = doc.constructor.modelName;
    // get previous values for modified fields
    let prev: any = null;
    if (!doc.isNew) {
      prev = await doc.constructor.findById(doc._id).select(fields.join(" "));
    }
    for (const field of fields) {
      const prevIds = toIdArray(prev ? prev.get(field) : []);
      const nextIds = toIdArray(doc.get(field));
      await diffAndSync(modelName, doc._id, field, prevIds, nextIds);
    }
  });

  // When using findOneAndUpdate
  schema.pre("findOneAndUpdate", async function () {
    const query: any = this;
    const modelName = query.model.modelName;
    const current = await query.model
      .findOne(query.getFilter())
      .select(fields.join(" "));
    if (!current) return;
    const update = query.getUpdate() || {};
    // Build a next-values object by applying $set/$unset (simplified)
    const nextValues: Record<string, any> = {};
    for (const f of fields) nextValues[f] = current.get(f);
    const $set = update.$set || update;
    const $unset = update.$unset || {};
    for (const f of fields) {
      if ($set && Object.prototype.hasOwnProperty.call($set, f)) {
        nextValues[f] = $set[f];
      }
      if ($unset && Object.prototype.hasOwnProperty.call($unset, f)) {
        nextValues[f] = undefined;
      }
    }
    for (const field of fields) {
      const prevIds = toIdArray(current.get(field));
      const nextIds = toIdArray(nextValues[field]);
      await diffAndSync(modelName, current._id, field, prevIds, nextIds);
    }
  });

  // When deleting a document
  schema.pre("findOneAndDelete", async function () {
    const query: any = this;
    const modelName = query.model.modelName;
    const current = await query.model.findOne(query.getFilter()).select("_id");
    if (!current) return;
    await ImageModel.updateMany(
      { "references.docId": current._id, "references.model": modelName },
      { $pull: { references: { docId: current._id, model: modelName } } }
    );
  });
}
