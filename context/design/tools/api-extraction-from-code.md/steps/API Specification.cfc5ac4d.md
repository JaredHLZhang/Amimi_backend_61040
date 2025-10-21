---
timestamp: 'Tue Oct 21 2025 13:36:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_133651.35ec071b.md]]'
content_id: cfc5ac4dc42911b58b9e320bf4914d283deaddb58f831bed3d110b09ba782f95
---

# API Specification: Labeling Concept

**Purpose:** Associate labels with generic items, and manage these associations.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with a given name.

**Requirements:**

* no Label with the given `name` already exists

**Effects:**

* creates a new Label `l`; sets the name of `l` to `name`; returns `l` as `label`

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/addLabel

**Description:** Associates an existing label with a specific item.

**Requirements:**

* ...

**Effects:**

* ...

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/deleteLabel

**Description:** Removes a specific label association from an item.

**Requirements:**

* ...

**Effects:**

* ...

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
