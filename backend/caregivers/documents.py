"""
Private storage for caregiver verification documents.

Production (CLOUDINARY_URL set): files go to Cloudinary as `authenticated`
assets, so they are never reachable by a public URL. Admins get short-lived
signed links (see document_url).

Development (no CLOUDINARY_URL): files are saved to the local media folder.
Render's disk is wiped on every deploy, so always set CLOUDINARY_URL there.
"""
import time

from django.conf import settings

ALLOWED_TYPES = {'application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'}
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp'}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB
LINK_LIFETIME_SECONDS = 15 * 60


def cloudinary_enabled():
    return bool(getattr(settings, 'CLOUDINARY_URL', ''))


def validate_upload(f):
    """Return an error message, or '' if the file is acceptable."""
    ext = (f.name.rsplit('.', 1)[-1] if '.' in f.name else '').lower()
    ctype = (getattr(f, 'content_type', '') or '').lower()
    if ext not in ALLOWED_EXTENSIONS and ctype not in ALLOWED_TYPES:
        return f'"{f.name}" must be a PDF or a photo (JPG or PNG).'
    if f.size > MAX_BYTES:
        return f'"{f.name}" is larger than 10 MB. Try a smaller photo or scan.'
    return ''


def store(doc, f):
    """Save uploaded file `f` onto CaregiverDocument `doc` (not yet saved)."""
    doc.original_name = f.name[:255]
    if cloudinary_enabled():
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            f,
            folder=f'tunza/verification/{doc.caregiver_id}',
            type='authenticated',      # private: needs a signed URL to view
            resource_type='auto',      # images stay images, PDFs become raw/image
            use_filename=False,
            unique_filename=True,
        )
        doc.cloud_public_id = result['public_id']
        doc.cloud_resource = result.get('resource_type', 'image')
        doc.cloud_format = result.get('format', '') or ''
    else:
        doc.file = f


def remove(doc):
    """Delete the stored file (best effort)."""
    try:
        if doc.cloud_public_id and cloudinary_enabled():
            import cloudinary.uploader
            cloudinary.uploader.destroy(doc.cloud_public_id, type='authenticated',
                                        resource_type=doc.cloud_resource or 'image', invalidate=True)
        elif doc.file:
            doc.file.delete(save=False)
    except Exception:  # never block a resubmission because cleanup failed
        pass


def document_url(doc, request=None):
    """A link an admin can open. Cloudinary links expire after 15 minutes."""
    if doc.cloud_public_id and cloudinary_enabled():
        import cloudinary.utils
        return cloudinary.utils.private_download_url(
            doc.cloud_public_id,
            doc.cloud_format or '',
            resource_type=doc.cloud_resource or 'image',
            type='authenticated',
            expires_at=int(time.time()) + LINK_LIFETIME_SECONDS,
        )
    if doc.file:
        url = doc.file.url
        return request.build_absolute_uri(url) if request else url
    return ''
