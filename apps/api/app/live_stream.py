"""One authenticated, bounded SSE connection for workspace readings and events."""
import time
from flask import Blueprint,Response,stream_with_context,current_app,g
from .live_auth import authenticated,context_identity
from .db import transaction,one,rows
bp=Blueprint('live_stream',__name__)
@bp.get('/api/v1/users/me/live')
@authenticated
def live():
    actor_id=g.actor['id'];role=g.actor['role'];app=current_app._get_current_object()
    @stream_with_context
    def frames():
        from .live_resources import projection
        # Short leases revalidate the actual bearer session on every reconnect.
        # Transactions/connections are released before yielding or waiting.
        for index in range(6):
            with transaction() as c:
                profile=one(c,'SELECT * FROM profiles WHERE id=:id',id=actor_id)
                allowed=profile and profile['role']==role and profile['onboarding_completed_at']
                if allowed:
                    g.actor={**dict(profile),'id':actor_id}
                    context=projection(c)
                    context['authorized_context']=context_identity()
                else:context=None
                notifications=rows(c,"SELECT n.id,n.episode_id,n.template_key,n.channel,n.status,n.payload,n.created_at,i.acknowledged_at,i.snoozed_until FROM notifications n LEFT JOIN notification_interactions i ON i.notification_id=n.id AND i.recipient_id=:uid WHERE n.recipient_id=:uid ORDER BY n.created_at DESC LIMIT 100",uid=actor_id) if allowed else []
            if not allowed:
                yield 'event: reauthenticate\ndata: {}\n\n';return
            yield 'event: snapshot\ndata: '+app.json.dumps({'context':context,'notifications':notifications})+'\n\n'
            if index<5:time.sleep(5)
    response=Response(frames(),mimetype='text/event-stream')
    response.headers['X-Accel-Buffering']='no'
    response.headers['Cache-Control']='no-store, no-transform'
    return response
