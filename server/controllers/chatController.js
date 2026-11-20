// POST /api/projects/:id/chat
// Send a revision prompt and return updated project.

import { Project } from "../models/Project.js";
import { reviseProject } from "../services/ai.js";
import { applyOperations } from "../services/diff.js";


export function buildManifest(files) {
    const manifest = [];
    for (const [path, entry] of Object.entries(files)) {
        // entry can be either { content, hash } object or a plain string (after manual edits)
        const content = typeof entry === "string" ? entry : entry?.content ?? "";
        const hash = typeof entry === "string" ? "" : entry?.hash ?? "";
        manifest.push({
            path,
            hash,
            size: content.length,
        });
    }
    return manifest;
}


export async function chat(req, res) {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "prompt is required" });
        return;
    }

    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    let project;
    try {
        project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    } catch (err) {
        res.status(500).json({ error: "Failed to load project" });
        return;
    }

    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }

    // ── Snapshot the current files BEFORE any AI changes ─────────────────────
    // Deep-clone so we can roll back if the revision fails or produces errors.
    const fileSnapshot = JSON.parse(JSON.stringify(project.files));

    // Record the user message but do NOT change status yet — wait until we
    // know the AI call succeeded so we don't get stuck in "revising" state.
    project.messages.push({
        role: "user",
        content: prompt,
        timestamp: new Date(),
    });
    project.status = "revising";
    await project.save();

    try {
        // Build manifest (safe against plain-string file values)
        const manifest = buildManifest(project.files);

        // Include all file contents for the AI
        const relevantFiles = {};
        for (const [path, entry] of Object.entries(project.files)) {
            relevantFiles[path] = typeof entry === "string" ? entry : entry?.content ?? "";
        }

        // Recent messages for context (last 6 max)
        const recentMessages = project.messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
        }));

        console.log(
            `[AI] Revising project ${project._id}: "${prompt.slice(0, 80)}..." ` +
            `(${manifest.length} files, manifest ~${JSON.stringify(manifest).length} chars)`,
        );

        // ── Call AI ─────────────────────────────────────────────────────────
        const result = await reviseProject(prompt, manifest, relevantFiles, recentMessages);

        console.log(
            `[AI] Got ${result.operations.length} operations: ${result.description}`
        );

        // ── Apply operations ─────────────────────────────────────────────────
        const { files: updatedFiles, applied, errors } = applyOperations(project.files, result.operations);

        // ── If ALL operations failed, roll back to snapshot ──────────────────
        if (errors.length > 0 && applied.length === 0) {
            console.warn(`[Diff] All operations failed — rolling back to snapshot. Errors:`, errors);

            project.files = fileSnapshot;
            project.markModified("files");
            project.status = "completed";
            project.messages.push({
                role: "assistant",
                content: `I encountered issues applying the changes and rolled back to the previous state.\n\nErrors:\n${errors.join("\n")}`,
                timestamp: new Date(),
            });
            await project.save();

            // Return the rolled-back project so the user can still see their files
            const filesObj = {};
            for (const [path, entry] of Object.entries(project.files)) {
                filesObj[path] = typeof entry === "string" ? entry : entry?.content ?? "";
            }

            return res.status(200).json({
                _id: project._id,
                name: project.name,
                description: project.description,
                files: filesObj,
                messages: project.messages,
                version: project.version,
                status: project.status,
                applied: [],
                errors,
                aiDescription: result.description,
                rolledBack: true,
            });
        }

        // ── Partial errors — apply what succeeded, warn about failures ────────
        if (errors.length > 0) {
            console.warn(`[Diff] ${errors.length} operation(s) failed (${applied.length} succeeded):`, errors);
        }

        // ── Save updated files ───────────────────────────────────────────────
        project.files = updatedFiles;
        project.markModified("files");
        project.version += 1;
        project.status = "completed";
        project.messages.push({
            role: "assistant",
            content: result.description + (
                errors.length > 0
                    ? `\n\n⚠️ Some changes could not be applied:\n${errors.join("\n")}`
                    : ""
            ),
            timestamp: new Date(),
        });
        await project.save();

        // ── Build response ────────────────────────────────────────────────────
        const filesObj = {};
        for (const [path, entry] of Object.entries(project.files)) {
            filesObj[path] = typeof entry === "string" ? entry : entry?.content ?? "";
        }

        res.json({
            _id: project._id,
            name: project.name,
            description: project.description,
            files: filesObj,
            messages: project.messages,
            version: project.version,
            status: project.status,
            applied,
            errors,
            aiDescription: result.description,
            rolledBack: false,
        });

    } catch (error) {
        // ── AI call or unexpected error — roll back to snapshot ──────────────
        console.error("[AI] Revision failed:", error);

        try {
            project.files = fileSnapshot;
            project.markModified("files");
            project.status = "completed";
            project.messages.push({
                role: "assistant",
                content: `Sorry, I encountered an error and your project has been restored to its previous state.\n\nError: ${error.message || "Unknown error"}`,
                timestamp: new Date(),
            });
            await project.save();
        } catch (saveErr) {
            console.error("[AI] Failed to save rollback:", saveErr);
        }

        // Return the rolled-back state so the client shows the working project
        const filesObj = {};
        for (const [path, entry] of Object.entries(fileSnapshot)) {
            filesObj[path] = typeof entry === "string" ? entry : entry?.content ?? "";
        }

        res.status(200).json({
            _id: project._id,
            name: project.name,
            description: project.description,
            files: filesObj,
            messages: project.messages,
            version: project.version,
            status: "completed",
            applied: [],
            errors: [error.message || "AI revision failed"],
            aiDescription: null,
            rolledBack: true,
        });
    }
}
