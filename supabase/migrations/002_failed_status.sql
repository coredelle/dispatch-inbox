-- Allow a 'failed' status for loads whose extraction was refused or errored
alter table loads drop constraint if exists loads_status_check;
alter table loads add constraint loads_status_check
  check (status in ('needs_review', 'approved', 'rejected', 'failed'));
