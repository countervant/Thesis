import express from "express";
import Client from "../model/Admin/Clientmodel.js";
import User from "../model/userModel.js";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import { isValidPhoneNumber } from "../utils/phoneValidation.js";

const router = express.Router();
const emailRegex =
  /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const isValidEmail = (email) => {
  const trimmedEmail = email.trim();
  return (
    trimmedEmail.length <= 254 &&
    !trimmedEmail.includes("..") &&
    emailRegex.test(trimmedEmail)
  );
};

const normalizeClientPayload = (body) => ({
  companyName: body.companyName?.trim() || "",
  contactPerson: body.contactPerson?.trim() || "",
  email: body.email?.trim().toLowerCase() || "",
  phone: body.phone?.trim() || "",
  service: body.service?.trim() || "",
  address: body.address?.trim() || "",
  notes: body.notes?.trim() || "",
  isActive: body.isActive ?? true,
  assignedEmployee: body.assignedEmployee || undefined,
});

const validateClientPayload = (payload) => {
  if (!payload.contactPerson) return "Client name is required";
  if (!payload.companyName) return "Company name is required";
  if (!payload.email) return "Email is required";
  if (!isValidEmail(payload.email)) return "Enter a valid email";
  if (!isValidPhoneNumber(payload.phone)) return "Enter a valid phone number";
  return "";
};

const clientUserToClient = (user) => ({
  _id: user._id,
  source: "user",
  companyName: user.companyName || "Registered Client",
  contactPerson: [user.firstName, user.lastName].filter(Boolean).join(" "),
  email: user.email,
  phone: user.phone || "",
  service: user.position || "",
  isActive: user.isActive,
  address: "",
  notes: "",
  assignedEmployee: undefined,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const clients = await Client.find()
      .populate("assignedEmployee", "firstName lastName email role")
      .sort({ createdAt: -1 });
    const clientUsers = await User.find({ role: "client" })
      .select("-password -resetPasswordToken -resetPasswordOTP")
      .sort({ createdAt: -1 });

    res.status(200).json([
      ...clientUsers.map(clientUserToClient),
      ...clients.map((client) => ({ ...client.toObject(), source: "client" })),
    ]);
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ message: "Unable to fetch clients" });
  }
});

router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const payload = normalizeClientPayload(req.body);
    const validationMessage = validateClientPayload(payload);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const emailOwner = await Client.findOne({ email: payload.email });
    if (emailOwner) {
      return res.status(400).json({ message: "Client email already exists" });
    }

    const client = await Client.create(payload);
    res.status(201).json(client);
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ message: "Unable to create client" });
  }
});

router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      const userClient = await User.findOne({
        _id: req.params.id,
        role: "client",
      });

      if (!userClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      const payload = normalizeClientPayload({
        companyName: req.body.companyName || "Registered Client",
        contactPerson:
          req.body.contactPerson ||
          [userClient.firstName, userClient.lastName].filter(Boolean).join(" "),
        email: req.body.email ?? userClient.email,
        phone: req.body.phone ?? userClient.phone,
        service: req.body.service ?? userClient.position,
        isActive: req.body.isActive ?? userClient.isActive,
      });
      const validationMessage = validateClientPayload(payload);

      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }

      const emailOwner = await User.findOne({
        email: payload.email,
        _id: { $ne: userClient._id },
      });

      if (emailOwner) {
        return res.status(400).json({ message: "Client email already exists" });
      }

      const [firstName, ...lastNameParts] = payload.contactPerson.split(/\s+/);
      userClient.firstName = firstName || userClient.firstName;
      userClient.lastName = lastNameParts.join(" ") || userClient.lastName;
      userClient.email = payload.email;
      userClient.phone = payload.phone;
      userClient.position = payload.service;
      userClient.isActive = payload.isActive;

      await userClient.save();
      return res.status(200).json(clientUserToClient(userClient));
    }

    const payload = normalizeClientPayload({
      companyName: req.body.companyName ?? client.companyName,
      contactPerson: req.body.contactPerson ?? client.contactPerson,
      email: req.body.email ?? client.email,
      phone: req.body.phone ?? client.phone,
      service: req.body.service ?? client.service,
      address: req.body.address ?? client.address,
      notes: req.body.notes ?? client.notes,
      isActive: req.body.isActive ?? client.isActive,
      assignedEmployee: req.body.assignedEmployee ?? client.assignedEmployee,
    });
    const validationMessage = validateClientPayload(payload);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const emailOwner = await Client.findOne({
      email: payload.email,
      _id: { $ne: client._id },
    });

    if (emailOwner) {
      return res.status(400).json({ message: "Client email already exists" });
    }

    client.companyName = payload.companyName;
    client.contactPerson = payload.contactPerson;
    client.email = payload.email;
    client.phone = payload.phone;
    client.service = payload.service;
    client.address = payload.address;
    client.notes = payload.notes;
    client.isActive = payload.isActive;
    client.assignedEmployee = payload.assignedEmployee;

    await client.save();
    res.status(200).json(client);
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ message: "Unable to update client" });
  }
});

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);

    if (!client) {
      const userClient = await User.findOneAndDelete({
        _id: req.params.id,
        role: "client",
      });

      if (!userClient) {
        return res.status(404).json({ message: "Client not found" });
      }
    }

    res.status(200).json({ message: "Client deleted" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ message: "Unable to delete client" });
  }
});

export default router;
