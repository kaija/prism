pub mod event;
pub mod validation;

pub use event::{EnrichedEvent, IngestPayload, ProfileUpdatePayload};
pub use validation::{validate, FieldError, ValidationErrors};
