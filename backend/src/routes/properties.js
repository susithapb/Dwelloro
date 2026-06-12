import jwt from "jsonwebtoken";
import Property from "../models/Property.js";
import Compliance from "../models/Compliance.js";
import Ticket from "../models/Ticket.js";
import Inspection from "../models/Inspection.js";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/requireRoles.js";
import { strip, now, planLimitFor } from "../utils/helpers.js";
import { collect, required } from "../utils/validate.js";
import { COMPLIANCE_AREAS } from "../config/constants.js";
import env from "../config/env.js";

function allowedForProperty(user, property) {
  if (!property) return false;
  if (user.role === "property_manager") return property.manager_id === user.sub;
  if (user.role === "landlord") return property.landlord_id === user.sub;
  if (user.role === "tenant") return property.tenant_id === user.sub;
  // Inspector access to a specific property is checked via assignment at the route level
  return false;
}

function ownerQuery(user, propertyId) {
  const q = { id: propertyId };
  if (user.role === "landlord") q.landlord_id = user.sub;
  else q.manager_id = user.sub;
  return q;
}

export default async function propertyRoutes(app) {
  app.get("/", { preHandler: authenticate }, async (req) => {
    const { role, sub } = req.user;
    const query = {};
    if (role === "tenant") query.tenant_id = sub;
    else if (role === "landlord") query.landlord_id = sub;
    else if (role === "property_manager") query.manager_id = sub;
    else if (role === "inspector") {
      // Inspectors see only properties where they have an assigned inspection
      const assignments = await Inspection.find({ inspector_id: sub }, { property_id: 1 });
      const propertyIds = [...new Set(assignments.map((i) => i.property_id))];
      query.id = { $in: propertyIds };
    }
    const items = await Property.find(query)
      .sort({ created_at: -1 })
      .limit(500);
    return items.map(strip);
  });

  app.post(
    "/",
    { preHandler: requireRoles("property_manager", "landlord") },
    async (req, reply) => {
      const isLandlord = req.user.role === "landlord";
      const u = await User.findOne({ id: req.user.sub });
      const tier = u?.plan_tier || "free";
      const limit = planLimitFor(tier);
      if (limit !== Infinity) {
        const countQuery = isLandlord
          ? { landlord_id: req.user.sub }
          : { manager_id: req.user.sub };
        const count = await Property.countDocuments(countQuery);
        if (count >= limit) {
          return reply.code(403).send({
            detail: "plan_limit_reached",
            plan_tier: tier,
            limit,
            used: count,
            message: `Your ${tier} plan is limited to ${limit} ${limit === 1 ? "property" : "properties"}. Upgrade to add more.`,
          });
        }
      }
      const b = req.body || {};
      const err = collect(
        required(b.address, "address"),
        required(b.suburb, "suburb"),
        required(b.city, "city"),
      );
      if (err) return reply.code(400).send({ detail: err });
      const idField = isLandlord ? "landlord_id" : "manager_id";
      const p = await Property.create({ ...b, [idField]: req.user.sub });
      for (const area of COMPLIANCE_AREAS)
        await Compliance.create({ property_id: p.id, area });
      return strip(p);
    }
  );

  app.get("/:id", { preHandler: authenticate }, async (req, reply) => {
    const property = await Property.findOne({ id: req.params.id });
    if (!property)
      return reply.code(404).send({ detail: "Property not found" });

    if (req.user.role === "inspector") {
      const assigned = await Inspection.exists({
        property_id: req.params.id,
        inspector_id: req.user.sub,
      });
      if (!assigned) return reply.code(403).send({ detail: "Forbidden" });
    } else if (!allowedForProperty(req.user, property)) {
      return reply.code(403).send({ detail: "Forbidden" });
    }

    return strip(property);
  });

  app.patch(
    "/:id",
    { preHandler: requireRoles("property_manager", "landlord") },
    async (req, reply) => {
      const property = await Property.findOne(ownerQuery(req.user, req.params.id));
      if (!property) return reply.code(404).send({ detail: "Property not found" });

      // Landlords can't reassign landlord_id on their own properties
      const EDITABLE = req.user.role === "landlord"
        ? ["address", "suburb", "city", "postcode", "bedrooms", "bathrooms", "notes", "tenant_id"]
        : ["address", "suburb", "city", "postcode", "bedrooms", "bathrooms", "notes", "tenant_id", "landlord_id"];
      const body = req.body || {};

      for (const key of EDITABLE) {
        if (key in body) property[key] = body[key] === "" ? null : body[key];
      }

      if (body.tenant_id) {
        const tenant = await User.findOne({ id: body.tenant_id, role: "tenant" });
        if (!tenant) return reply.code(400).send({ detail: "User is not a tenant" });
      }

      await property.save();
      return strip(property);
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireRoles("property_manager", "landlord") },
    async (req, reply) => {
      const property = await Property.findOne(ownerQuery(req.user, req.params.id));
      if (!property) return reply.code(404).send({ detail: "Property not found" });
      await Compliance.deleteMany({ property_id: property.id });
      await Ticket.deleteMany({ property_id: property.id });
      await Inspection.deleteMany({ property_id: property.id });
      await property.deleteOne();
      return reply.code(204).send();
    },
  );

  app.post(
    "/:id/share",
    { preHandler: requireRoles("property_manager", "landlord") },
    async (req, reply) => {
      const property = await Property.findOne({ id: req.params.id });
      if (!property)
        return reply.code(404).send({ detail: "Property not found" });
      const token = jwt.sign(
        { scope: "public_report", pid: property.id },
        env.JWT_SECRET,
        { expiresIn: "90d" },
      );
      const url = `${env.APP_PUBLIC_URL}/share/property/${property.id}?t=${token}`;
      return { url, token, expires_in_days: 90 };
    },
  );
}
